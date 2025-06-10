"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const postgres_js_1 = require("drizzle-orm/postgres-js");
const postgres_1 = __importDefault(require("postgres"));
const dotenv = __importStar(require("dotenv"));
dotenv.config({ path: '../.env' });
const { DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!DATABASE_URL || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Database URL, Supabase URL, and Supabase Service Role Key are required.');
}
const supabaseAdmin = (0, supabase_js_1.createClient)(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const client = (0, postgres_1.default)(DATABASE_URL);
const db = (0, postgres_js_1.drizzle)(client);
async function migrateUsers() {
    console.log('Starting user migration to Supabase...');
    const userIdMapping = {}; // Map old user ID to new Supabase UUID
    try {
        // 1. Fetch all users from the old 'users' table using a raw query
        console.log('Fetching users from the local database...');
        const result = await client `SELECT id, uuid, email, full_name as "fullName", is_admin as "isAdmin", is_council_member as "isCouncilMember" FROM users`;
        const oldUsers = result.map(row => ({
            id: row.id,
            uuid: row.uuid,
            email: row.email,
            fullName: row.fullName,
            isAdmin: row.isAdmin,
            isCouncilMember: row.isCouncilMember,
        }));
        console.log(`Found ${oldUsers.length} users to migrate.`);
        // 2. Create users in Supabase and profiles table
        for (const user of oldUsers) {
            console.log(`Migrating user: ${user.email}`);
            // Create user in Supabase Auth
            const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: user.email,
                email_confirm: true, // Mark email as confirmed since they are existing users
                // Users will need to reset their passwords
            });
            if (authError) {
                if (authError.message.includes('already exists')) {
                    console.warn(`User ${user.email} already exists in Supabase. Fetching existing user...`);
                    const { data: existingUserList } = await supabaseAdmin.auth.admin.listUsers();
                    const existingUser = existingUserList.users.find(u => u.email === user.email);
                    if (existingUser) {
                        userIdMapping[user.id] = existingUser.id;
                        console.log(`Mapped existing user ${user.email} (${user.id} -> ${existingUser.id})`);
                    }
                    continue;
                }
                else {
                    console.error(`Error creating user ${user.email} in Supabase Auth:`, authError.message);
                    continue; // Skip to the next user
                }
            }
            const newUserId = authUser?.user?.id;
            if (!newUserId) {
                console.error(`Could not get new user ID for ${user.email}. Skipping profile creation.`);
                continue;
            }
            // Store the mapping
            userIdMapping[user.id] = newUserId;
            // Create a corresponding profile in the 'profiles' table
            let role = 'user';
            if (user.isAdmin) {
                role = 'admin';
            }
            else if (user.isCouncilMember) {
                role = 'council';
            }
            try {
                await client `
          INSERT INTO profiles (id, full_name, role, updated_at)
          VALUES (${newUserId}, ${user.fullName}, ${role}, NOW())
          ON CONFLICT (id) DO NOTHING
        `;
                console.log(`Successfully migrated user ${user.email} with role ${role}.`);
            }
            catch (profileError) {
                console.error(`Error creating profile for ${user.email}:`, profileError);
            }
        }
        // 3. Update foreign key references
        console.log('\nUpdating foreign key references...');
        for (const [oldId, newId] of Object.entries(userIdMapping)) {
            console.log(`Updating references for user ${oldId} -> ${newId}`);
            try {
                // Update system_settings
                await client `UPDATE system_settings SET updated_by_id_new = ${newId} WHERE updated_by_id = ${parseInt(oldId)}`;
                // Update violations
                await client `UPDATE violations SET reported_by_id_new = ${newId} WHERE reported_by_id = ${parseInt(oldId)}`;
                // Update violation_histories
                await client `UPDATE violation_histories SET user_id_new = ${newId} WHERE user_id = ${parseInt(oldId)}`;
                // Update communication_campaigns
                await client `UPDATE communication_campaigns SET created_by_id_new = ${newId} WHERE created_by_id = ${parseInt(oldId)}`;
                // Update communication_templates
                await client `UPDATE communication_templates SET created_by_id_new = ${newId} WHERE created_by_id = ${parseInt(oldId)}`;
                // Update bylaws
                await client `UPDATE bylaws SET created_by_id_new = ${newId} WHERE created_by_id = ${parseInt(oldId)}`;
                await client `UPDATE bylaws SET updated_by_id_new = ${newId} WHERE updated_by_id = ${parseInt(oldId)}`;
                // Update bylaw_revisions
                await client `UPDATE bylaw_revisions SET created_by_id_new = ${newId} WHERE created_by_id = ${parseInt(oldId)}`;
                // Update audit_logs
                await client `UPDATE audit_logs SET user_id_new = ${newId} WHERE user_id = ${parseInt(oldId)}`;
                // Update admin_announcements
                await client `UPDATE admin_announcements SET created_by_new = ${newId} WHERE created_by = ${parseInt(oldId)}`;
                await client `UPDATE admin_announcements SET updated_by_new = ${newId} WHERE updated_by = ${parseInt(oldId)}`;
            }
            catch (updateError) {
                console.error(`Error updating references for user ${oldId}:`, updateError);
            }
        }
        console.log('\nUser migration completed successfully!');
        console.log('\nNext steps:');
        console.log('1. Test the application with the new authentication system');
        console.log('2. Run the cleanup migration to drop old columns and tables');
        console.log('3. Notify users that they need to reset their passwords');
    }
    catch (error) {
        console.error('An error occurred during the migration:', error);
    }
    finally {
        await client.end();
        console.log('Database connection closed.');
    }
}
migrateUsers();
