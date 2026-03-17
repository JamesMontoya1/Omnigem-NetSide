-- Synchronize Worker id sequence with the current max id
-- Run this against the database if you encounter Prisma P2002 on Worker.id
SELECT setval(pg_get_serial_sequence('"Worker"','id'), COALESCE((SELECT MAX(id) FROM "Worker"),0)+1, false);
