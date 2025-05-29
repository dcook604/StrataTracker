import { Router } from 'express';
import { db } from '../db';
import { 
  communicationCampaigns, 
  communicationRecipients, 
  communicationTemplates,
  propertyUnits,
  persons,
  unitPersonRoles,
  users,
  insertCommunicationCampaignSchema,
  insertCommunicationTemplateSchema,
  CommunicationType,
  RecipientType
} from '@shared/schema';
import { eq, desc, and, inArray, or, sql } from 'drizzle-orm';
import { sendEmail } from '../email-service';
import { Request, Response } from 'express';

const router = Router();

// Middleware to ensure user is admin or council member
const ensureCouncilOrAdmin = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated() && req.user && (req.user.isCouncilMember || req.user.isAdmin)) {
    return next();
  }
  res.status(403).json({ message: "Forbidden - Admin or Council access required" });
};

// Apply middleware to all routes
router.use(ensureCouncilOrAdmin);

// CAMPAIGNS ROUTES

// Get all campaigns
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
          id: users.id,
          fullName: users.fullName,
          email: users.email
        }
      })
      .from(communicationCampaigns)
      .leftJoin(users, eq(communicationCampaigns.createdById, users.id))
      .orderBy(desc(communicationCampaigns.createdAt));

    // Get recipient counts for each campaign
    const campaignIds = campaigns.map(c => c.id);
    if (campaignIds.length > 0) {
      const recipientCounts = await db
        .select({
          campaignId: communicationRecipients.campaignId,
          totalRecipients: sql<number>`COUNT(*)`.as('totalRecipients'),
          sentCount: sql<number>`COUNT(CASE WHEN ${communicationRecipients.status} = 'sent' THEN 1 END)`.as('sentCount'),
          failedCount: sql<number>`COUNT(CASE WHEN ${communicationRecipients.status} = 'failed' THEN 1 END)`.as('failedCount')
        })
        .from(communicationRecipients)
        .where(inArray(communicationRecipients.campaignId, campaignIds))
        .groupBy(communicationRecipients.campaignId);

      const campaignsWithStats = campaigns.map(campaign => {
        const stats = recipientCounts.find(rc => rc.campaignId === campaign.id);
        return {
          ...campaign,
          totalRecipients: stats?.totalRecipients || 0,
          sentCount: stats?.sentCount || 0,
          failedCount: stats?.failedCount || 0
        };
      });

      return res.json(campaignsWithStats);
    }

    res.json(campaigns.map(c => ({ ...c, totalRecipients: 0, sentCount: 0, failedCount: 0 })));
  } catch (error) {
    console.error('Error fetching campaigns:', error);
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
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ message: 'Failed to fetch campaign' });
  }
});

// Create campaign
router.post('/campaigns', async (req, res) => {
  try {
    const data = insertCommunicationCampaignSchema.parse(req.body);
    const { recipientType, unitIds, personIds } = req.body;

    const [campaign] = await db
      .insert(communicationCampaigns)
      .values({
        ...data,
        createdById: req.user!.id
      })
      .returning();

    // Generate recipients based on type
    const recipients = await generateRecipients(recipientType, unitIds, personIds);
    
    if (recipients.length > 0) {
      await db
        .insert(communicationRecipients)
        .values(recipients.map(recipient => ({
          campaignId: campaign.id,
          ...recipient
        })));
    }

    res.status(201).json(campaign);
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ message: 'Failed to create campaign' });
  }
});

// Update campaign
router.put('/campaigns/:id', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const data = insertCommunicationCampaignSchema.partial().parse(req.body);

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
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ message: 'Failed to update campaign' });
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
      return res.status(400).json({ message: 'Campaign has already been sent or is in progress' });
    }

    // Update campaign status to sending
    await db
      .update(communicationCampaigns)
      .set({ 
        status: 'sending',
        updatedAt: new Date()
      })
      .where(eq(communicationCampaigns.id, campaignId));

    // Get pending recipients
    const recipients = await db
      .select()
      .from(communicationRecipients)
      .where(and(
        eq(communicationRecipients.campaignId, campaignId),
        eq(communicationRecipients.status, 'pending')
      ));

    // Send emails asynchronously
    sendCampaignEmails(campaign, recipients);

    res.json({ message: 'Campaign sending started', recipientCount: recipients.length });
  } catch (error) {
    console.error('Error sending campaign:', error);
    res.status(500).json({ message: 'Failed to send campaign' });
  }
});

// TEMPLATES ROUTES

// Get all templates
router.get('/templates', async (req, res) => {
  try {
    const templates = await db
      .select()
      .from(communicationTemplates)
      .orderBy(desc(communicationTemplates.createdAt));

    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
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
        createdById: req.user!.id
      })
      .returning();

    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ message: 'Failed to create template' });
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
  } catch (error) {
    console.error('Error generating recipient preview:', error);
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
  } catch (error) {
    console.error('Error fetching units:', error);
    res.status(500).json({ message: 'Failed to fetch units' });
  }
});

// HELPER FUNCTIONS

async function generateRecipients(recipientType: RecipientType, unitIds?: number[], personIds?: number[]) {
  const recipients: any[] = [];

  switch (recipientType) {
    case 'all':
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

      // Filter valid emails in application logic
      const validAllPersons = allPersons.filter(person => 
        person.email && person.email.trim() !== '' && person.email.includes('@')
      );

      recipients.push(...validAllPersons.map(person => ({
        recipientType: 'all',
        unitId: person.unitId || undefined,
        personId: person.id,
        email: person.email,
        recipientName: person.fullName
      })));
      break;

    case 'owners':
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

      // Filter valid emails in application logic
      const validOwners = owners.filter(owner => 
        owner.email && owner.email.trim() !== '' && owner.email.includes('@')
      );

      recipients.push(...validOwners.map(owner => ({
        recipientType: 'owners',
        unitId: owner.unitId || undefined,
        personId: owner.id,
        email: owner.email,
        recipientName: owner.fullName
      })));
      break;

    case 'tenants':
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

      // Filter valid emails in application logic
      const validTenants = tenants.filter(tenant => 
        tenant.email && tenant.email.trim() !== '' && tenant.email.includes('@')
      );

      recipients.push(...validTenants.map(tenant => ({
        recipientType: 'tenants',
        unitId: tenant.unitId || undefined,
        personId: tenant.id,
        email: tenant.email,
        recipientName: tenant.fullName
      })));
      break;

    case 'units':
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

        // Filter valid emails in application logic
        const validUnitPersons = unitPersons.filter(person => 
          person.email && person.email.trim() !== '' && person.email.includes('@')
        );

        recipients.push(...validUnitPersons.map(person => ({
          recipientType: 'units',
          unitId: person.unitId || undefined,
          personId: person.id,
          email: person.email,
          recipientName: person.fullName
        })));
      }
      break;

    case 'individual':
      if (personIds && personIds.length > 0) {
        const selectedPersons = await db
          .select({
            id: persons.id,
            fullName: persons.fullName,
            email: persons.email
          })
          .from(persons)
          .where(inArray(persons.id, personIds));

        // Filter valid emails in application logic
        const validSelectedPersons = selectedPersons.filter(person => 
          person.email && person.email.trim() !== '' && person.email.includes('@')
        );

        recipients.push(...validSelectedPersons.map(person => ({
          recipientType: 'individual',
          personId: person.id,
          email: person.email,
          recipientName: person.fullName
        })));
      }
      break;
  }

  return recipients;
}

async function sendCampaignEmails(campaign: any, recipients: any[]) {
  let successCount = 0;
  let failCount = 0;

  for (const recipient of recipients) {
    try {
      const success = await sendEmail({
        to: recipient.email,
        subject: campaign.subject,
        html: campaign.content,
        text: campaign.plainTextContent || stripHtml(campaign.content)
      });

      if (success) {
        await db
          .update(communicationRecipients)
          .set({ 
            status: 'sent',
            sentAt: new Date()
          })
          .where(eq(communicationRecipients.id, recipient.id));
        successCount++;
      } else {
        await db
          .update(communicationRecipients)
          .set({ 
            status: 'failed',
            errorMessage: 'Failed to send email'
          })
          .where(eq(communicationRecipients.id, recipient.id));
        failCount++;
      }
    } catch (error) {
      console.error(`Error sending email to ${recipient.email}:`, error);
      await db
        .update(communicationRecipients)
        .set({ 
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        })
        .where(eq(communicationRecipients.id, recipient.id));
      failCount++;
    }

    // Small delay to avoid overwhelming the email service
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Update campaign status
  const finalStatus = failCount === 0 ? 'sent' : (successCount === 0 ? 'failed' : 'sent');
  await db
    .update(communicationCampaigns)
    .set({
      status: finalStatus,
      sentAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(communicationCampaigns.id, campaign.id));

  console.log(`Campaign ${campaign.id} completed: ${successCount} sent, ${failCount} failed`);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>?/gm, '');
}

export default router; 