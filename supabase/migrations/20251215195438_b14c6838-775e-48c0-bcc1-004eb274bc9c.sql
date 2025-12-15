-- Define senha temporária para médicos cadastrados sem senha
UPDATE usuarios 
SET senha_hash = '123456', deve_trocar_senha = true 
WHERE id IN (
  'b776b20e-ab59-43e6-82f5-7d2d45291706',
  '906cce78-b0b7-434a-a347-1f376e4706cf',
  'dc0ec9c8-93ec-48d4-8fc0-6e2c8d09a560',
  'b4c0d230-9855-4a18-83ec-790b7860094c'
) AND senha_hash IS NULL;