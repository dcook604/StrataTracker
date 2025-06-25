import express from "express";
import { db } from "../db.js";
import { storage } from '../storage.js';
import {
  communicationCampaigns,
  insertCommunicationCampaignSchema,
  communicationRecipients,
  communicationTemplates,
  persons,
  propertyUnits,
  insertCommunicationTemplateSchema,
  RecipientType,
  profiles,
  unitPersonRoles,
  emailTrackingEvents,
  manualEmailRecipients,
  emailDeduplicationLog
} from "#shared/schema.js";
import { eq, desc, and, sql, inArray, gte } from "drizzle-orm";
import { sendEmailWithDeduplication } from "../email-deduplication.js";
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { EmailDeduplicationService } from '../email-deduplication.js';
import { AuthenticatedRequest } from '../middleware/supabase-auth-middleware.js';

const router = express.Router();

// Middleware to ensure user is admin or council member (FIXED for Supabase auth)
const ensureCouncilOrAdmin = (req: Request, res: Response, next: NextFunction) => {
  const request = req as AuthenticatedRequest;
  const role = request.appUser?.profile?.role;
  if (role === 'council' || role === 'admin') {
    return next();
  }
  res.status(403).json({ message: "Forbidden - Admin or Council access required" });
};

// Apply middleware to all routes
router.use(ensureCouncilOrAdmin);

// Get campaigns with enhanced tracking stats
router.get('/campaigns', async (req, res) => {
  try {
    const campaigns = await db
      .select({
        id: communicationCampaigns.id,
        uuid: communicationCampaigns.uuid,
        title: communicationCampaigns.title,
        type: communicationCampaigns.type,
        status: communicationCampaigns.status,
        subject: communicationCampaigns.subject,
        scheduledAt: communicationCampaigns.scheduledAt,
        sentAt: communicationCampaigns.sentAt,
        createdAt: communicationCampaigns.createdAt,
        createdBy: {
          fullName: profiles.fullName,
          email: persons.email
        }
      })
      .from(communicationCampaigns)
      .leftJoin(profiles, eq(communicationCampaigns.createdById, profiles.id))
      .leftJoin(persons, eq(profiles.id, persons.authUserId))
      .orderBy(desc(communicationCampaigns.createdAt));

    const campaignIds = campaigns.map(c => c.id);

    if (campaignIds.length > 0) {
      // Get recipient counts and tracking stats
      const [recipientCounts, trackingStats] = await Promise.all([
        // Basic recipient stats
        db
          .select({
            campaignId: communicationRecipients.campaignId,
            totalRecipients: sql<number>`COUNT(*)`.as('totalRecipients'),
            sentCount: sql<number>`COUNT(CASE WHEN ${communicationRecipients.status} = 'sent' THEN 1 END)`.as('sentCount'),
            failedCount: sql<number>`COUNT(CASE WHEN ${communicationRecipients.status} = 'failed' THEN 1 END)`.as('failedCount')
          })
          .from(communicationRecipients)
          .where(inArray(communicationRecipients.campaignId, campaignIds))
          .groupBy(communicationRecipients.campaignId),
        
        // Tracking stats
        db
          .select({
            campaignId: emailTrackingEvents.campaignId,
            openCount: sql<number>`COUNT(CASE WHEN ${emailTrackingEvents.eventType} = 'open' THEN 1 END)`.as('openCount'),
            clickCount: sql<number>`COUNT(CASE WHEN ${emailTrackingEvents.eventType} = 'click' THEN 1 END)`.as('clickCount'),
            uniqueOpens: sql<number>`COUNT(DISTINCT CASE WHEN ${emailTrackingEvents.eventType} = 'open' THEN ${emailTrackingEvents.recipientId} END)`.as('uniqueOpens'),
          })
          .from(emailTrackingEvents)
          .where(inArray(emailTrackingEvents.campaignId, campaignIds))
          .groupBy(emailTrackingEvents.campaignId)
      ]);

      const campaignsWithStats = campaigns.map(campaign => {
        const recipientStats = recipientCounts.find(rc => rc.campaignId === campaign.id);
        const tracking = trackingStats.find(ts => ts.campaignId === campaign.id);
        
        return {
          ...campaign,
          totalRecipients: recipientStats?.totalRecipients || 0,
          sentCount: recipientStats?.sentCount || 0,
          failedCount: recipientStats?.failedCount || 0,
          openCount: tracking?.openCount || 0,
          clickCount: tracking?.clickCount || 0,
          uniqueOpens: tracking?.uniqueOpens || 0,
          openRate: (recipientStats?.sentCount && recipientStats.sentCount > 0) ? 
            ((tracking?.uniqueOpens || 0) / recipientStats.sentCount * 100).toFixed(2) : '0'
        };
      });

      return res.json(campaignsWithStats);
    }

    res.json(campaigns.map(c => ({ 
      ...c, 
      totalRecipients: 0, 
      sentCount: 0, 
      failedCount: 0, 
      openCount: 0, 
      clickCount: 0, 
      uniqueOpens: 0,
      openRate: '0'
    })));
  } catch (error: unknown) {
    console.error('Error fetching campaigns:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Failed to fetch campaigns' });
  }
});

// Get single campaign
router.get('/campaigns/:id', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    
    const [campaign] = await db
      .select()
      .from(communicationCampaigns)
      .where(eq(communicationCampaigns.id, campaignId));

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Get recipients for this campaign
    const recipients = await db
      .select()
      .from(communicationRecipients)
      .where(eq(communicationRecipients.campaignId, campaignId))
      .orderBy(communicationRecipients.recipientName);

    res.json({ ...campaign, recipients });
  } catch (error: unknown) {
    console.error('Error fetching campaign:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Failed to fetch campaign' });
  }
});

// Create campaign with enhanced recipient handling
router.post('/campaigns', async (req, res) => {
  try {
    const data = insertCommunicationCampaignSchema.parse(req.body);
    const { recipientType, unitIds, personIds, manualEmails } = req.body;

    const [campaign] = await db
      .insert(communicationCampaigns)
      .values({
        ...data,
        createdById: (req as AuthenticatedRequest).appUser.profile.id,
      })
      .returning();

    // Generate recipients based on type
    const recipients = await generateRecipients(recipientType, unitIds, personIds);
    
    // Handle manual email entries
    if (recipientType === 'manual' && manualEmails && manualEmails.length > 0) {
      // Add manual email recipients
      await db
        .insert(manualEmailRecipients)
        .values(manualEmails.map((emailEntry: { email: string; name?: string }) => ({
          campaignId: campaign.id,
          email: emailEntry.email,
          name: emailEntry.name || emailEntry.email
        })));

      // Add to recipients list
      recipients.push(...manualEmails.map((emailEntry: { email: string; name?: string }) => ({
        recipientType: 'manual',
        email: emailEntry.email,
        recipientName: emailEntry.name || emailEntry.email,
        trackingId: crypto.randomBytes(16).toString('hex')
      })));
    }
    
    if (recipients.length > 0) {
      await db
        .insert(communicationRecipients)
        .values(recipients.map(({ trackingId, ...recipient }) => ({
          campaignId: campaign.id,
          trackingId: trackingId || crypto.randomBytes(16).toString('hex'),
          ...recipient
        })));
    }

    res.status(201).json(campaign);
  } catch (error: unknown) {
    console.error('Error creating campaign:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Failed to create campaign' });
  }
});

// Send campaign
router.post('/campaigns/:id/send', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);

    const [campaign] = await db
      .select()
      .from(communicationCampaigns)
      .where(eq(communicationCampaigns.id, campaignId));

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    if (campaign.status !== 'draft') {
      return res.status(400).json({ message: 'Campaign has already been sent or is not in draft status' });
    }

    // Update campaign status to sending
    await db
      .update(communicationCampaigns)
      .set({ status: 'sending' })
      .where(eq(communicationCampaigns.id, campaignId));

    // Get recipients
    const recipients = await db
      .select()
      .from(communicationRecipients)
      .where(eq(communicationRecipients.campaignId, campaignId));

    // Start sending emails in background
    sendCampaignEmails(campaign, recipients).catch(error => {
      console.error('Error sending campaign emails:', error);
    });

    res.json({ message: 'Campaign sending started' });
  } catch (error: unknown) {
    console.error('Error starting campaign send:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Failed to start sending campaign' });
  }
});

// Update campaign
router.put('/campaigns/:id', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const data = insertCommunicationCampaignSchema.parse(req.body);

    const [updatedCampaign] = await db
      .update(communicationCampaigns)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(communicationCampaigns.id, campaignId))
      .returning();

    if (!updatedCampaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json(updatedCampaign);
  } catch (error: unknown) {
    console.error('Error updating campaign:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Failed to update campaign' });
  }
});

// Delete campaign
router.delete('/campaigns/:id', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);

    const [deletedCampaign] = await db
      .delete(communicationCampaigns)
      .where(eq(communicationCampaigns.id, campaignId))
      .returning();

    if (!deletedCampaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json({ message: 'Campaign deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting campaign:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Failed to delete campaign' });
  }
});

// TEMPLATE ROUTES

// Get templates
router.get('/templates', async (req, res) => {
  try {
    const templates = await db
      .select({
        id: communicationTemplates.id,
        uuid: communicationTemplates.uuid,
        name: communicationTemplates.name,
        type: communicationTemplates.type,
        subject: communicationTemplates.subject,
        content: communicationTemplates.content,
        isDefault: communicationTemplates.isDefault,
        createdAt: communicationTemplates.createdAt,
        createdBy: {
          fullName: profiles.fullName,
          email: persons.email
        }
      })
      .from(communicationTemplates)
      .leftJoin(profiles, eq(communicationTemplates.createdById, profiles.id))
      .leftJoin(persons, eq(profiles.id, persons.authUserId))
      .orderBy(desc(communicationTemplates.createdAt));

    res.json(templates);
  } catch (error: unknown) {
    console.error('Error fetching templates:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Failed to fetch templates' });
  }
});

// Create template
router.post('/templates', async (req, res) => {
  try {
    const data = insertCommunicationTemplateSchema.parse(req.body);

    const [template] = await db
      .insert(communicationTemplates)
      .values({
        ...data,
        createdById: (req as AuthenticatedRequest).appUser.profile.id,
      })
      .returning();

    res.status(201).json(template);
  } catch (error: unknown) {
    console.error('Error creating template:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Failed to create template' });
  }
});

// Update template
router.put('/templates/:id', async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const data = insertCommunicationTemplateSchema.parse(req.body);

    const [updatedTemplate] = await db
      .update(communicationTemplates)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(communicationTemplates.id, templateId))
      .returning();

    if (!updatedTemplate) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json(updatedTemplate);
  } catch (error: unknown) {
    console.error('Error updating template:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Failed to update template' });
  }
});

// Delete template
router.delete('/templates/:id', async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);

    const [deletedTemplate] = await db
      .delete(communicationTemplates)
      .where(eq(communicationTemplates.id, templateId))
      .returning();

    if (!deletedTemplate) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json({ message: 'Template deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting template:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Failed to delete template' });
  }
});

// EMAIL TRACKING ROUTES

// Track email opens (pixel endpoint)
router.get('/track/open/:trackingId', async (req, res) => {
  try {
    const { trackingId } = req.params;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Find the recipient
    const [recipient] = await db
      .select()
      .from(communicationRecipients)
      .where(eq(communicationRecipients.trackingId, trackingId));

    if (recipient) {
      // Record the tracking event
      await db
        .insert(emailTrackingEvents)
        .values({
          campaignId: recipient.campaignId,
          recipientId: recipient.id,
          trackingId: trackingId,
          eventType: 'open',
          ipAddress: ipAddress,
          userAgent: userAgent,
          eventData: {
            timestamp: new Date().toISOString(),
            headers: {
              'User-Agent': userAgent,
              'Accept-Language': req.get('Accept-Language'),
              'Referer': req.get('Referer')
            }
          }
        });
    }

    // Return 1x1 transparent pixel
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.set({
      'Content-Type': 'image/gif',
      'Content-Length': pixel.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.send(pixel);
  } catch (error: unknown) {
    console.error('Error tracking email open:', error instanceof Error ? error.message : 'Unknown error');
    // Still return pixel even on error
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.set('Content-Type', 'image/gif');
    res.send(pixel);
  }
});

// Track email clicks
router.get('/track/click/:trackingId', async (req, res) => {
  try {
    const { trackingId } = req.params;
    const { url } = req.query;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Find the recipient
    const [recipient] = await db
      .select()
      .from(communicationRecipients)
      .where(eq(communicationRecipients.trackingId, trackingId));

    if (recipient) {
      // Record the tracking event
      await db
        .insert(emailTrackingEvents)
        .values({
          campaignId: recipient.campaignId,
          recipientId: recipient.id,
          trackingId: trackingId,
          eventType: 'click',
          ipAddress: ipAddress,
          userAgent: userAgent,
          eventData: {
            url: url,
            timestamp: new Date().toISOString()
          }
        });
    }

    // Redirect to the original URL
    if (url && typeof url === 'string') {
      res.redirect(url);
    } else {
      res.status(400).json({ message: 'Invalid URL' });
    }
  } catch (error: unknown) {
    console.error('Error tracking email click:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Failed to track click' });
  }
});

// REPORTING ROUTES

// Get campaign analytics/reports
router.get('/campaigns/:id/analytics', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    
    // Get campaign details
    const [campaign] = await db
      .select()
      .from(communicationCampaigns)
      .where(eq(communicationCampaigns.id, campaignId));

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Get comprehensive analytics
    const [recipientStats, trackingStats, timelineData] = await Promise.all([
      // Recipient delivery stats
      db
        .select({
          totalRecipients: sql<number>`COUNT(*)`.as('totalRecipients'),
          sentCount: sql<number>`COUNT(CASE WHEN ${communicationRecipients.status} = 'sent' THEN 1 END)`.as('sentCount'),
          failedCount: sql<number>`COUNT(CASE WHEN ${communicationRecipients.status} = 'failed' THEN 1 END)`.as('failedCount'),
          pendingCount: sql<number>`COUNT(CASE WHEN ${communicationRecipients.status} = 'pending' THEN 1 END)`.as('pendingCount')
        })
        .from(communicationRecipients)
        .where(eq(communicationRecipients.campaignId, campaignId)),

      // Tracking engagement stats
      db
        .select({
          totalOpens: sql<number>`COUNT(CASE WHEN ${emailTrackingEvents.eventType} = 'open' THEN 1 END)`.as('totalOpens'),
          uniqueOpens: sql<number>`COUNT(DISTINCT CASE WHEN ${emailTrackingEvents.eventType} = 'open' THEN ${emailTrackingEvents.recipientId} END)`.as('uniqueOpens'),
          totalClicks: sql<number>`COUNT(CASE WHEN ${emailTrackingEvents.eventType} = 'click' THEN 1 END)`.as('totalClicks'),
          uniqueClicks: sql<number>`COUNT(DISTINCT CASE WHEN ${emailTrackingEvents.eventType} = 'click' THEN ${emailTrackingEvents.recipientId} END)`.as('uniqueClicks')
        })
        .from(emailTrackingEvents)
        .where(eq(emailTrackingEvents.campaignId, campaignId)),

      // Timeline data (opens/clicks over time)
      db
        .select({
          date: sql<string>`DATE(${emailTrackingEvents.timestamp})`.as('date'),
          eventType: emailTrackingEvents.eventType,
          count: sql<number>`COUNT(*)`.as('count')
        })
        .from(emailTrackingEvents)
        .where(eq(emailTrackingEvents.campaignId, campaignId))
        .groupBy(sql`DATE(${emailTrackingEvents.timestamp})`, emailTrackingEvents.eventType)
        .orderBy(sql`DATE(${emailTrackingEvents.timestamp})`)
    ]);

    const analytics = {
      campaign,
      delivery: recipientStats[0] || { totalRecipients: 0, sentCount: 0, failedCount: 0, pendingCount: 0 },
      engagement: trackingStats[0] || { totalOpens: 0, uniqueOpens: 0, totalClicks: 0, uniqueClicks: 0 },
      timeline: timelineData,
      metrics: {
        deliveryRate: recipientStats[0]?.totalRecipients > 0 ? 
          ((recipientStats[0].sentCount / recipientStats[0].totalRecipients) * 100).toFixed(2) : '0',
        openRate: recipientStats[0]?.sentCount > 0 ? 
          ((trackingStats[0]?.uniqueOpens || 0) / recipientStats[0].sentCount * 100).toFixed(2) : '0',
        clickRate: recipientStats[0]?.sentCount > 0 ? 
          ((trackingStats[0]?.uniqueClicks || 0) / recipientStats[0].sentCount * 100).toFixed(2) : '0',
        clickToOpenRate: trackingStats[0]?.uniqueOpens > 0 ? 
          ((trackingStats[0]?.uniqueClicks || 0) / trackingStats[0].uniqueOpens * 100).toFixed(2) : '0'
      }
    };

    res.json(analytics);
  } catch (error: unknown) {
    console.error('Error fetching campaign analytics:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
});

// Get recipient-level tracking details
router.get('/campaigns/:id/recipients', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    
    const recipients = await db
      .select({
        id: communicationRecipients.id,
        email: communicationRecipients.email,
        recipientName: communicationRecipients.recipientName,
        status: communicationRecipients.status,
        sentAt: communicationRecipients.sentAt,
        trackingId: communicationRecipients.trackingId,
        openCount: sql<number>`COUNT(CASE WHEN ${emailTrackingEvents.eventType} = 'open' THEN 1 END)`.as('openCount'),
        clickCount: sql<number>`COUNT(CASE WHEN ${emailTrackingEvents.eventType} = 'click' THEN 1 END)`.as('clickCount'),
        lastOpenAt: sql<string>`MAX(CASE WHEN ${emailTrackingEvents.eventType} = 'open' THEN ${emailTrackingEvents.timestamp} END)`.as('lastOpenAt'),
        lastClickAt: sql<string>`MAX(CASE WHEN ${emailTrackingEvents.eventType} = 'click' THEN ${emailTrackingEvents.timestamp} END)`.as('lastClickAt')
      })
      .from(communicationRecipients)
      .leftJoin(emailTrackingEvents, eq(communicationRecipients.id, emailTrackingEvents.recipientId))
      .where(eq(communicationRecipients.campaignId, campaignId))
      .groupBy(
        communicationRecipients.id,
        communicationRecipients.email,
        communicationRecipients.recipientName,
        communicationRecipients.status,
        communicationRecipients.sentAt,
        communicationRecipients.trackingId
      )
      .orderBy(communicationRecipients.recipientName);

    res.json(recipients);
  } catch (error: unknown) {
    console.error('Error fetching recipients:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Failed to fetch recipients' });
  }
});

// RECIPIENT MANAGEMENT ROUTES

// Get recipient preview for targeting options
router.post('/recipients/preview', async (req, res) => {
  try {
    const { recipientType, unitIds, personIds } = req.body;
    const recipients = await generateRecipients(recipientType, unitIds, personIds);
    
    res.json({
      count: recipients.length,
      recipients: recipients.slice(0, 10), // Preview first 10
      totalCount: recipients.length
    });
  } catch (error: unknown) {
    console.error('Error generating recipient preview:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Failed to generate recipient preview' });
  }
});

// Get units for recipient selection
router.get('/units', async (req, res) => {
  try {
    const units = await db
      .select({
        id: propertyUnits.id,
        unitNumber: propertyUnits.unitNumber,
        floor: propertyUnits.floor
      })
      .from(propertyUnits)
      .orderBy(propertyUnits.unitNumber);

    res.json(units);
  } catch (error: unknown) {
    console.error('Error fetching units:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Failed to fetch units' });
  }
});

// HELPER FUNCTIONS

async function generateRecipients(recipientType: RecipientType, unitIds?: number[], personIds?: number[]) {
  const recipients: Array<{
    recipientType: string;
    unitId?: number;
    personId?: number;
    email: string;
    recipientName: string;
    trackingId: string;
  }> = [];

  // Generate tracking ID for each recipient
  const generateTrackingId = () => crypto.randomBytes(16).toString('hex');

  switch (recipientType) {
    case 'all': {
      const allPersons = await db
        .select({
          id: persons.id,
          fullName: persons.fullName,
          email: persons.email,
          unitId: unitPersonRoles.unitId
        })
        .from(persons)
        .leftJoin(unitPersonRoles, eq(persons.id, unitPersonRoles.personId))
        .where(and(
          eq(unitPersonRoles.receiveEmailNotifications, true)
        ));

      const validAllPersons = allPersons.filter(person => 
        person.email && person.email.trim() !== '' && person.email.includes('@')
      );

      recipients.push(...validAllPersons.map(person => ({
        recipientType: 'all',
        unitId: person.unitId || undefined,
        personId: person.id,
        email: person.email,
        recipientName: person.fullName,
        trackingId: generateTrackingId()
      })));
      break;
    }
    case 'owners': {
      const owners = await db
        .select({
          id: persons.id,
          fullName: persons.fullName,
          email: persons.email,
          unitId: unitPersonRoles.unitId
        })
        .from(persons)
        .leftJoin(unitPersonRoles, eq(persons.id, unitPersonRoles.personId))
        .where(and(
          eq(unitPersonRoles.role, 'owner'),
          eq(unitPersonRoles.receiveEmailNotifications, true)
        ));

      const validOwners = owners.filter(owner => 
        owner.email && owner.email.trim() !== '' && owner.email.includes('@')
      );

      recipients.push(...validOwners.map(owner => ({
        recipientType: 'owners',
        unitId: owner.unitId || undefined,
        personId: owner.id,
        email: owner.email,
        recipientName: owner.fullName,
        trackingId: generateTrackingId()
      })));
      break;
    }
    case 'tenants': {
      const tenants = await db
        .select({
          id: persons.id,
          fullName: persons.fullName,
          email: persons.email,
          unitId: unitPersonRoles.unitId
        })
        .from(persons)
        .leftJoin(unitPersonRoles, eq(persons.id, unitPersonRoles.personId))
        .where(and(
          eq(unitPersonRoles.role, 'tenant'),
          eq(unitPersonRoles.receiveEmailNotifications, true)
        ));

      const validTenants = tenants.filter(tenant => 
        tenant.email && tenant.email.trim() !== '' && tenant.email.includes('@')
      );

      recipients.push(...validTenants.map(tenant => ({
        recipientType: 'tenants',
        unitId: tenant.unitId || undefined,
        personId: tenant.id,
        email: tenant.email,
        recipientName: tenant.fullName,
        trackingId: generateTrackingId()
      })));
      break;
    }
    case 'units': {
      if (unitIds && unitIds.length > 0) {
        const unitPersons = await db
          .select({
            id: persons.id,
            fullName: persons.fullName,
            email: persons.email,
            unitId: unitPersonRoles.unitId
          })
          .from(persons)
          .leftJoin(unitPersonRoles, eq(persons.id, unitPersonRoles.personId))
          .where(and(
            inArray(unitPersonRoles.unitId, unitIds),
            eq(unitPersonRoles.receiveEmailNotifications, true)
          ));

        const validUnitPersons = unitPersons.filter(person => 
          person.email && person.email.trim() !== '' && person.email.includes('@')
        );

        recipients.push(...validUnitPersons.map(person => ({
          recipientType: 'units',
          unitId: person.unitId || undefined,
          personId: person.id,
          email: person.email,
          recipientName: person.fullName,
          trackingId: generateTrackingId()
        })));
      }
      break;
    }
    case 'individual': {
      if (personIds && personIds.length > 0) {
        const selectedPersons = await db
          .select({
            id: persons.id,
            fullName: persons.fullName,
            email: persons.email
          })
          .from(persons)
          .where(inArray(persons.id, personIds));

        const validSelectedPersons = selectedPersons.filter(person => 
          person.email && person.email.trim() !== '' && person.email.includes('@')
        );

        recipients.push(...validSelectedPersons.map(person => ({
          recipientType: 'individual',
          personId: person.id,
          email: person.email,
          recipientName: person.fullName,
          trackingId: generateTrackingId()
        })));
      }
      break;
    }
  }

  return recipients;
}

async function sendCampaignEmails(campaign: { id: number; subject: string; content: string; type?: string }, recipients: Array<{ id: number; email: string; trackingId: string }>) {
  console.log(`Starting to send ${recipients.length} emails for campaign: ${campaign.subject}`);
  
  const results: Array<{
    email: string;
    success: boolean;
    isDuplicate: boolean;
    message: string;
    idempotencyKey?: string;
  }> = [];
  
  for (const recipient of recipients) {
    try {
      // Add tracking pixel to email content
      const trackingPixelUrl = `${process.env.APP_URL || 'http://localhost:3001'}/api/communications/track/open/${recipient.trackingId}`;
      const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:block;" />`;
      
      // Wrap links with tracking
      let emailContent = campaign.content;
      const baseUrl = process.env.APP_URL || 'http://localhost:3001';
      
      // Simple link wrapping (can be enhanced with more sophisticated parsing)
      emailContent = emailContent.replace(
        /<a\s+href="([^"]+)"/g,
        `<a href="${baseUrl}/api/communications/track/click/${recipient.trackingId}?url=$1"`
      );
      
      // Add tracking pixel at the end
      emailContent += trackingPixel;

      // Use the new deduplication service
      const emailResult = await sendEmailWithDeduplication({
        to: recipient.email,
        subject: campaign.subject,
        html: emailContent,
        text: stripHtml(campaign.content),
        emailType: 'campaign',
        metadata: {
          campaignId: campaign.id,
          recipientId: recipient.id,
          trackingId: recipient.trackingId,
          recipientType: campaign.type || 'campaign'
        }
      });

      if (emailResult.success && !emailResult.isDuplicate) {
        // Mark as sent in campaign recipients
        await db.update(communicationRecipients)
          .set({ 
            status: 'sent', 
            sentAt: new Date() 
          })
          .where(eq(communicationRecipients.id, recipient.id));
        
        console.log(`✓ Email sent to ${recipient.email} (key: ${emailResult.idempotencyKey})`);
      } else if (emailResult.isDuplicate) {
        // Mark as sent but note it was a duplicate
        await db.update(communicationRecipients)
          .set({ 
            status: 'sent', 
            sentAt: new Date(),
            errorMessage: 'Duplicate prevented'
          })
          .where(eq(communicationRecipients.id, recipient.id));
        
        console.log(`⚠ Duplicate email prevented for ${recipient.email} (${emailResult.message})`);
      } else {
        // Mark as failed
        await db.update(communicationRecipients)
          .set({ 
            status: 'failed',
            errorMessage: emailResult.message
          })
          .where(eq(communicationRecipients.id, recipient.id));
        
        console.error(`✗ Failed to send email to ${recipient.email}: ${emailResult.message}`);
      }

      results.push({
        email: recipient.email,
        success: emailResult.success,
        isDuplicate: emailResult.isDuplicate,
        message: emailResult.message,
        idempotencyKey: emailResult.idempotencyKey
      });

      // Rate limiting - wait 100ms between emails
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error: unknown) {
      console.error(`Error sending email to ${recipient.email}:`, error instanceof Error ? error.message : 'Unknown error');
      
      // Mark as failed in database
      await db.update(communicationRecipients)
        .set({ 
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        })
        .where(eq(communicationRecipients.id, recipient.id));

      results.push({
        email: recipient.email,
        success: false,
        isDuplicate: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Update campaign status
  const sentCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;
  const finalStatus = failedCount === 0 ? 'sent' : (sentCount > 0 ? 'sent' : 'failed');
  
  await db.update(communicationCampaigns)
    .set({ 
      status: finalStatus, 
      sentAt: new Date() 
    })
    .where(eq(communicationCampaigns.id, campaign.id));

  console.log(`Campaign email sending completed. Success: ${sentCount}, Failed: ${failedCount}, Duplicates: ${results.filter(r => r.isDuplicate).length}`);
  
  return results;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

// EMAIL DEDUPLICATION MANAGEMENT ENDPOINTS

// Get email deduplication statistics
router.get('/email-stats', ensureCouncilOrAdmin, async (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const stats = await EmailDeduplicationService.getEmailStats(hours);
    
    res.json({
      success: true,
      timeframe: `${hours} hours`,
      stats
    });
  } catch (error: unknown) {
    console.error('Error fetching email stats:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch email statistics' 
    });
  }
});

// Clean up expired email records (admin only)
router.post('/email-cleanup', ensureCouncilOrAdmin, async (req, res) => {
  try {
    const result = await EmailDeduplicationService.cleanupExpiredRecords();
    
    res.json({
      success: true,
      message: 'Email cleanup completed successfully',
      result
    });
  } catch (error: unknown) {
    console.error('Error during email cleanup:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ 
      success: false, 
      message: 'Failed to cleanup email records' 
    });
  }
});

// Get recent email deduplication logs for monitoring
router.get('/email-deduplication-logs', ensureCouncilOrAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const hours = parseInt(req.query.hours as string) || 24;
    
    const hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - hours);
    
    const logs = await db
      .select({
        id: emailDeduplicationLog.id,
        recipientEmail: emailDeduplicationLog.recipientEmail,
        emailType: emailDeduplicationLog.emailType,
        preventedAt: emailDeduplicationLog.preventedAt,
        metadata: emailDeduplicationLog.metadata
      })
      .from(emailDeduplicationLog)
      .where(gte(emailDeduplicationLog.preventedAt, hoursAgo))
      .orderBy(desc(emailDeduplicationLog.preventedAt))
      .limit(limit);
    
    res.json({
      success: true,
      logs,
      count: logs.length,
      timeframe: `${hours} hours`
    });
  } catch (error: unknown) {
    console.error('Error fetching deduplication logs:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch deduplication logs' 
    });
  }
});

export default router; 