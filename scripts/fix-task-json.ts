/**
 * Script to fix malformed JSON fields in the tasks table
 * Run this to clean up any existing tasks that have empty strings or invalid JSON
 */

import { getDatabase } from '../src/lib/database';

async function fixTaskJson() {
  const db = getDatabase();
  
  console.log('Checking for tasks with malformed JSON...');
  
  const tasks = await db.prepare('SELECT id, labels, assignees, checklist FROM tasks').all();
  
  let fixedCount = 0;
  
  for (const task of tasks.results) {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    // Check labels
    if (task.labels === '' || task.labels === null) {
      updates.push(`labels = $${paramIndex++}`);
      values.push('[]');
      console.log(`  Task ${task.id}: fixing labels`);
    }
    
    // Check assignees
    if (task.assignees === '' || task.assignees === null) {
      updates.push(`assignees = $${paramIndex++}`);
      values.push('[]');
      console.log(`  Task ${task.id}: fixing assignees`);
    }
    
    // Check checklist
    if (task.checklist === '' || task.checklist === null) {
      updates.push(`checklist = $${paramIndex++}`);
      values.push('[]');
      console.log(`  Task ${task.id}: fixing checklist`);
    }
    
    if (updates.length > 0) {
      const sql = `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
      values.push(task.id);
      await db.prepare(sql).bind(...values).run();
      fixedCount++;
    }
  }
  
  console.log(`\nFixed ${fixedCount} tasks with malformed JSON`);
}

fixTaskJson().catch(console.error);


