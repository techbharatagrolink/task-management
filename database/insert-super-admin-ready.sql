-- =====================================================
-- SUPER ADMIN INSERT FOR BHARAT AGROLINK
-- =====================================================
-- Email: admin@bharatagrolink.com
-- Password: bharatagrolink@2024
-- Role: Super Admin
-- =====================================================

USE inhouse_management;

-- Delete existing admin if exists (optional - uncomment if needed)
-- DELETE FROM users WHERE email = 'admin@bharatagrolink.com';

-- Insert Super Admin with generated bcrypt hash
INSERT INTO users (name, email, password, role, is_active, created_at)
VALUES (
    'Super Admin',
    'admin@bharatagrolink.com',
    '$2b$10$NwDRbCN6LBI6H1h8GP8TGuGExfhAx3LCIW.VG0Xr.7ik.k1IqpXm2',
    'Super Admin',
    1,
    NOW()
)
ON DUPLICATE KEY UPDATE
    password = VALUES(password),
    role = VALUES(role),
    is_active = 1;

-- Verify the user was created
SELECT 
    id, 
    name, 
    email, 
    role, 
    is_active, 
    created_at 
FROM users 
WHERE email = 'admin@bharatagrolink.com';

