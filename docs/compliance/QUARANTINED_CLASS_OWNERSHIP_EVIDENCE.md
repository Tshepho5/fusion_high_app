# Evidence required for the eleven quarantined classes

This note records what is known and what is still required. It does not assign the classes to a school.

The eleven class rows still use school id 1. That school is not in the schools table. None of the rows has a teacher or a homeroom teacher. No school application records school id 1 as the school it created. The project has no database backup that names school id 1. The class names match an old setup script that inserted classes without a school while the column default was 1. That explains the number. It does not identify a real school.

The foreign key `classes_school_id_fkey` is `NOT VALID`. PostgreSQL checks new and updated class rows against it. The eleven existing rows are left unchecked until `VALIDATE CONSTRAINT` is run. That command must not be run until ownership is established.

The rows must not be deleted, renamed, or moved to another school on the basis of the class names.

Ownership can be established only by one of the following:

1. A database backup taken while a row with `schools.id = 1` still existed, showing that school’s name and EMIS number, together with these class ids.
2. An audit or migration record that assigns class ids 3, 4, 5, 6, 7, 8, 9, 10, 13, 16, and 19 to one named school.
3. A written identification from the person who created those classes, naming the school and its EMIS number.

The class names alone are not sufficient.
