const db = require('../db/db');

async function seedTextbooksAndAllocations() {
  console.log('Seeding textbook inventory, allocations, and teacher subject assignments...');

  // 1. Update employees with their assigned subjects & grades
  await db.query(`
    UPDATE employees 
    SET subjects = ARRAY['Physical Sciences', 'Natural Sciences'],
        grades_taught = ARRAY[8, 9, 10, 11, 12]
    WHERE user_id = 2; -- Thabang Maetane

    UPDATE employees 
    SET subjects = ARRAY['Mathematics', 'Mathematical Literacy'],
        grades_taught = ARRAY[8, 9, 10, 11, 12]
    WHERE user_id = 3; -- Thapelo Leshabane

    UPDATE employees 
    SET subjects = ARRAY['Life Sciences', 'Natural Sciences'],
        grades_taught = ARRAY[8, 9, 10, 11, 12]
    WHERE user_id = 4; -- Minenhle Dlungwane

    UPDATE employees 
    SET subjects = ARRAY['English FAL', 'English Home Language', 'Economics'],
        grades_taught = ARRAY[10, 11, 12]
    WHERE user_id = 43; -- BONTLE MOTHOPENG

    UPDATE employees 
    SET subjects = ARRAY['isiZulu Home Language', 'Sepedi Home Language', 'isiXhosa Home Language', 'Languages'],
        grades_taught = ARRAY[8, 9, 10, 11, 12]
    WHERE user_id = 37; -- Bongumusa Kunene

    UPDATE employees 
    SET subjects = ARRAY['Accounting', 'Business Studies', 'EMS'],
        grades_taught = ARRAY[8, 9, 10, 11, 12]
    WHERE user_id = 34 OR user_id = 35; -- Peter Walters

    UPDATE employees 
    SET subjects = ARRAY['Geography', 'History', 'Social Sciences'],
        grades_taught = ARRAY[8, 9, 10, 11, 12]
    WHERE user_id = 23; -- Christopher Ravhura

    UPDATE employees 
    SET subjects = ARRAY['Life Orientation', 'Tourism', 'Technology'],
        grades_taught = ARRAY[8, 9, 10, 11, 12]
    WHERE user_id = 22; -- Thato Tlhaka
  `);
  console.log('Updated employee subject assignments.');

  // 2. Comprehensive textbook inventory items
  const inventoryItems = [
    // Grade 10
    { title: 'Platinum Mathematics Grade 10 Learner Book', subject: 'Mathematics', grade: 10, publisher: 'Pearson South Africa', isbn: '978-0-636-12784-5', barcode: 'MATH-10-001', copies: 90, cost: 280.00 },
    { title: 'Doc Scientia Physical Sciences Grade 10 Textbook & Workbook', subject: 'Physical Sciences', grade: 10, publisher: 'Doc Scientia', isbn: '978-0-6395-0010-9', barcode: 'PHYS-10-001', copies: 80, cost: 290.00 },
    { title: 'Understanding Life Sciences Grade 10 Learner Guide', subject: 'Life Sciences', grade: 10, publisher: 'Pulse Education', isbn: '978-1-92019-220-4', barcode: 'LIFE-10-001', copies: 85, cost: 275.00 },
    { title: 'English in Context First Additional Language Grade 10', subject: 'English FAL', grade: 10, publisher: 'Maskew Miller Longman', isbn: '978-0-636-08570-1', barcode: 'ENGL-10-001', copies: 95, cost: 245.00 },
    { title: 'IsiZulu Sethu Nezizukulwane Grade 10 Huistaal', subject: 'isiZulu Home Language', grade: 10, publisher: 'Oxford University Press', isbn: '978-0-1959-9680-7', barcode: 'ISIZ-10-001', copies: 70, cost: 230.00 },
    { title: 'New Era Accounting Grade 10 Learner Book', subject: 'Accounting', grade: 10, publisher: 'New Generation', isbn: '978-1-77581-000-1', barcode: 'ACC-10-001', copies: 60, cost: 260.00 },
    { title: 'Focus Business Studies Grade 10', subject: 'Business Studies', grade: 10, publisher: 'Maskew Miller Longman', isbn: '978-0-636-12701-2', barcode: 'BUSS-10-001', copies: 60, cost: 250.00 },
    { title: 'Enjoy Economics Grade 10', subject: 'Economics', grade: 10, publisher: 'Heinemann', isbn: '978-0-7962-3580-0', barcode: 'ECON-10-001', copies: 60, cost: 255.00 },
    { title: 'Via Afrika Geography Grade 10', subject: 'Geography', grade: 10, publisher: 'Via Afrika', isbn: '978-1-41542-260-1', barcode: 'GEOG-10-001', copies: 65, cost: 265.00 },
    { title: 'Spot On Life Orientation Grade 10', subject: 'Life Orientation', grade: 10, publisher: 'Pearson South Africa', isbn: '978-0-7962-3590-9', barcode: 'LIFE-10-002', copies: 100, cost: 210.00 },

    // Grade 11
    { title: 'Mind Action Series Mathematics Grade 11 Textbook', subject: 'Mathematics', grade: 11, publisher: 'Sanlam / Mind Action', isbn: '978-1-86921-511-7', barcode: 'MATH-11-001', copies: 90, cost: 310.00 },
    { title: 'Doc Scientia Physical Sciences Grade 11 Textbook & Workbook', subject: 'Physical Sciences', grade: 11, publisher: 'Doc Scientia', isbn: '978-0-6395-0011-6', barcode: 'PHYS-11-001', copies: 80, cost: 295.00 },
    { title: 'Understanding Life Sciences Grade 11 Learner Guide', subject: 'Life Sciences', grade: 11, publisher: 'Pulse Education', isbn: '978-1-92019-221-1', barcode: 'LIFE-11-001', copies: 85, cost: 280.00 },
    { title: 'English in Context First Additional Language Grade 11', subject: 'English FAL', grade: 11, publisher: 'Maskew Miller Longman', isbn: '978-0-636-08571-8', barcode: 'ENGL-11-001', copies: 95, cost: 250.00 },
    { title: 'IsiZulu Sethu Nezizukulwane Grade 11 Huistaal', subject: 'isiZulu Home Language', grade: 11, publisher: 'Oxford University Press', isbn: '978-0-1959-9681-4', barcode: 'ISIZ-11-001', copies: 70, cost: 235.00 },
    { title: 'New Era Accounting Grade 11 Learner Book', subject: 'Accounting', grade: 11, publisher: 'New Generation', isbn: '978-1-77581-001-8', barcode: 'ACC-11-001', copies: 60, cost: 265.00 },
    { title: 'Focus Business Studies Grade 11', subject: 'Business Studies', grade: 11, publisher: 'Maskew Miller Longman', isbn: '978-0-636-12702-9', barcode: 'BUSS-11-001', copies: 60, cost: 255.00 },
    { title: 'Enjoy Economics Grade 11', subject: 'Economics', grade: 11, publisher: 'Heinemann', isbn: '978-0-7962-3581-7', barcode: 'ECON-11-001', copies: 60, cost: 260.00 },
    { title: 'Via Afrika Geography Grade 11', subject: 'Geography', grade: 11, publisher: 'Via Afrika', isbn: '978-1-41542-268-7', barcode: 'GEOG-11-001', copies: 65, cost: 265.00 },
    { title: 'Spot On Life Orientation Grade 11', subject: 'Life Orientation', grade: 11, publisher: 'Pearson South Africa', isbn: '978-0-7962-3591-6', barcode: 'LIFE-11-002', copies: 100, cost: 215.00 },

    // Grade 12
    { title: 'Mind Action Series: Mathematics Grade 12 Textbook', subject: 'Mathematics', grade: 12, publisher: 'Sanlam / Mind Action', isbn: '978-1-86921-500-1', barcode: 'MATH-12-001', copies: 80, cost: 320.00 },
    { title: 'Doc Scientia: Physical Sciences Grade 12 Textbook & Workbook', subject: 'Physical Sciences', grade: 12, publisher: 'Doc Scientia', isbn: '978-0-6395-0012-3', barcode: 'PHYS-12-001', copies: 75, cost: 300.00 },
    { title: 'Understanding Life Sciences Grade 12 Learner Guide', subject: 'Life Sciences', grade: 12, publisher: 'Pulse Education', isbn: '978-1-92019-228-0', barcode: 'LIFE-12-001', copies: 75, cost: 285.00 },
    { title: 'English in Context: First Additional Language Grade 12', subject: 'English FAL', grade: 12, publisher: 'Maskew Miller Longman', isbn: '978-0-636-08573-2', barcode: 'ENGL-12-001', copies: 100, cost: 255.00 },
    { title: 'IsiZulu Sethu Nezizukulwane Grade 12 Huistaal', subject: 'isiZulu Home Language', grade: 12, publisher: 'Oxford University Press', isbn: '978-0-1959-9682-1', barcode: 'ISIZ-12-001', copies: 70, cost: 240.00 },
    { title: 'New Era Accounting Grade 12 Learner Book', subject: 'Accounting', grade: 12, publisher: 'New Generation', isbn: '978-1-77581-002-5', barcode: 'ACC-12-001', copies: 60, cost: 270.00 },
    { title: 'Focus Business Studies Grade 12', subject: 'Business Studies', grade: 12, publisher: 'Maskew Miller Longman', isbn: '978-0-636-12703-6', barcode: 'BUSS-12-001', copies: 60, cost: 260.00 },
    { title: 'Enjoy Economics Grade 12', subject: 'Economics', grade: 12, publisher: 'Heinemann', isbn: '978-0-7962-3582-4', barcode: 'ECON-12-001', copies: 60, cost: 265.00 },
    { title: 'Via Afrika Geography Grade 12', subject: 'Geography', grade: 12, publisher: 'Via Afrika', isbn: '978-1-41542-269-4', barcode: 'GEOG-12-001', copies: 65, cost: 270.00 },
    { title: 'Spot On Life Orientation Grade 12', subject: 'Life Orientation', grade: 12, publisher: 'Pearson South Africa', isbn: '978-0-7962-3592-3', barcode: 'LIFE-12-002', copies: 100, cost: 220.00 }
  ];

  for (const item of inventoryItems) {
    const existing = await db.query(
      `SELECT id FROM textbook_inventory WHERE title = $1 AND grade = $2`,
      [item.title, item.grade]
    );

    if (existing.rows.length === 0) {
      await db.query(`
        INSERT INTO textbook_inventory (title, subject, grade, publisher, isbn, barcode, total_copies, available_copies, unit_cost_zar)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8)
      `, [item.title, item.subject, item.grade, item.publisher, item.isbn, item.barcode, item.copies, item.cost]);
    } else {
      await db.query(`
        UPDATE textbook_inventory 
        SET subject = $1, publisher = $2, isbn = $3, barcode = $4, unit_cost_zar = $5 
        WHERE id = $6
      `, [item.subject, item.publisher, item.isbn, item.barcode, item.cost, existing.rows[0].id]);
    }
  }
  console.log('Seeded all textbook inventory items.');

  // 3. Issue/Allocate textbooks to each registered child for their enrolled subjects
  const childrenRes = await db.query(`SELECT id, grade, subjects FROM children`);
  const allInventoryRes = await db.query(`SELECT id, title, subject, grade, barcode FROM textbook_inventory`);
  const inventoryList = allInventoryRes.rows;

  let allocatedCount = 0;

  for (const child of childrenRes.rows) {
    const childGrade = child.grade || 10;
    const childSubjects = child.subjects || ['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL', 'isiZulu Home Language'];

    for (const subj of childSubjects) {
      // Find matching book in inventory
      const matchingBook = inventoryList.find(b => 
        b.grade === childGrade && (
          b.subject.toLowerCase() === subj.toLowerCase() ||
          subj.toLowerCase().includes(b.subject.toLowerCase()) ||
          b.subject.toLowerCase().includes(subj.toLowerCase())
        )
      );

      if (matchingBook) {
        // Check if allocation already exists
        const allocCheck = await db.query(`
          SELECT id FROM textbook_allocations 
          WHERE inventory_id = $1 AND child_id = $2
        `, [matchingBook.id, child.id]);

        if (allocCheck.rows.length === 0) {
          await db.query(`
            INSERT INTO textbook_allocations (inventory_id, child_id, issued_by_user_id, issued_date, condition_on_issue, status)
            VALUES ($1, $2, 1, CURRENT_DATE - INTERVAL '14 days', 'Good', 'issued')
          `, [matchingBook.id, child.id]);
          allocatedCount++;
        }
      }
    }
  }

  console.log(`Issued/allocated ${allocatedCount} textbooks to learners across all grades!`);
  process.exit(0);
}

seedTextbooksAndAllocations().catch(err => {
  console.error('Error seeding textbooks and allocations:', err);
  process.exit(1);
});
