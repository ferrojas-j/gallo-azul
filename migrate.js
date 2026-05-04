import { createClient } from '@supabase/supabase-js';

const oldUrl = 'https://hbxyeztlzjsayhwdqsxy.supabase.co';
const oldKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhieHllenRsempzYXlod2Rxc3h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNDE4NzIsImV4cCI6MjA5MDgxNzg3Mn0.HlVbvAQWWSHQEyq5cP4C8moKtt3uWcZE6cI1wh-ACQY';

const newUrl = 'https://quzjixxqowxbezbcmqws.supabase.co';
const newKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1emppeHhxb3d4YmV6YmNtcXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MTYwMTcsImV4cCI6MjA5MzQ5MjAxN30.cp_eoG5fAbead2rOdVbsHjNo5hLFMRvkFS9OvL5rcyk';

const oldSupabase = createClient(oldUrl, oldKey);
const newSupabase = createClient(newUrl, newKey);

async function migrate() {
  const tables = [
    'users',
    'menu_categories',
    'menu_items',
    'menu_item_variants',
    'tables',
    'orders',
    'order_items',
    'expenses',
    'printed_tickets',
    'shift_summaries',
    'daily_summaries'
  ];

  for (const table of tables) {
    console.log(`Migrating ${table}...`);
    const { data, error } = await oldSupabase.from(table).select('*');
    if (error) {
      console.error(`Error fetching ${table}:`, error);
      continue;
    }
    
    if (data && data.length > 0) {
      // Net is a generated column in daily_summaries, remove it before insert
      if (table === 'daily_summaries') {
          for (let row of data) {
              delete row.net;
          }
      }

      const { error: insertError } = await newSupabase.from(table).upsert(data);
      if (insertError) {
        console.error(`Error inserting into ${table}:`, insertError);
      } else {
        console.log(`Successfully migrated ${data.length} rows to ${table}.`);
      }
    } else {
      console.log(`No data found for ${table}.`);
    }
  }
  console.log('Migration complete!');
}

migrate();
