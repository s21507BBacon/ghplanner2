import { Pool } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { join } from 'path';
import { existsSync } from 'fs';

// Load environment variables
const envPath = join(process.cwd(), '.env');
if (existsSync(envPath)) {
  config({ path: envPath });
}

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

async function checkAndCreateShapesTable() {
  const pool = new Pool({ connectionString });
  
  try {
    // Check if shapes table exists
    const checkResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'shapes'
      );
    `);
    
    const tableExists = checkResult.rows[0].exists;
    console.log(`✓ Shapes table exists: ${tableExists}`);
    
    if (!tableExists) {
      console.log('Creating shapes table...');
      
      await pool.query(`
        CREATE TABLE shapes (
          id TEXT PRIMARY KEY,
          board_id TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('circle', 'oval', 'triangle', 'rectangle', 'square', 'diamond', 'text')),
          x INTEGER NOT NULL,
          y INTEGER NOT NULL,
          width INTEGER NOT NULL,
          height INTEGER NOT NULL,
          fill_color TEXT NOT NULL DEFAULT '#60a5fa',
          stroke_color TEXT DEFAULT '#1e293b',
          stroke_width INTEGER DEFAULT 2,
          text_content TEXT,
          font_family TEXT DEFAULT 'Inter, system-ui, sans-serif',
          font_size INTEGER DEFAULT 16,
          font_weight TEXT DEFAULT 'normal',
          text_color TEXT DEFAULT '#ffffff',
          text_align TEXT DEFAULT 'left',
          rotation INTEGER DEFAULT 0,
          opacity REAL DEFAULT 1.0,
          z_index INTEGER DEFAULT 0,
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL,
          FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
        );
      `);
      
      await pool.query(`CREATE INDEX idx_shapes_board ON shapes(board_id);`);
      await pool.query(`CREATE INDEX idx_shapes_type ON shapes(type);`);
      
      console.log('✅ Shapes table created successfully!');
      
      // Record migration
      await pool.query(
        'INSERT INTO schema_migrations (filename, executed_at) VALUES ($1, $2) ON CONFLICT (filename) DO NOTHING',
        ['014_create_shapes_table.sql', Date.now()]
      );
    } else {
      console.log('✅ Shapes table already exists!');
      
      // Check columns
      const columnsResult = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'shapes' 
        AND column_name IN ('width', 'height')
        ORDER BY column_name;
      `);
      
      console.log('Width and height columns:', columnsResult.rows);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkAndCreateShapesTable();
