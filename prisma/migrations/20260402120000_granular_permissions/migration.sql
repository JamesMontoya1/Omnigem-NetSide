-- Remove old simple permissions and seed granular view/edit permissions per screen

DELETE FROM "_PermissionToPermissionGroup";
DELETE FROM "Permission";

-- Re-seed with granular permissions (view + edit per screen)
INSERT INTO "Permission" ("key", "label", "description") VALUES
  ('shifts.view',          'Plantões — Visualizar',          'Ver a tela de plantões'),
  ('shifts.edit',          'Plantões — Editar',              'Criar, editar e excluir plantões'),
  ('vacations.view',       'Férias — Visualizar',            'Ver a tela de férias'),
  ('vacations.edit',       'Férias — Editar',                'Agendar, aprovar, editar e excluir férias'),
  ('trips.view',           'Viagens — Visualizar',           'Ver a tela de viagens'),
  ('trips.edit',           'Viagens — Editar',               'Criar, editar e excluir viagens'),
  ('sped_control.view',    'Controle SPED — Visualizar',     'Ver a tela de controle SPED'),
  ('sped_control.edit',    'Controle SPED — Editar',         'Editar registros SPED'),
  ('time_punches.view',    'Registro de Ponto — Visualizar', 'Ver a tela de registro de ponto'),
  ('time_punches.edit',    'Registro de Ponto — Editar',     'Importar, editar e excluir registros de ponto'),
  ('users.view',           'Usuários — Visualizar',          'Ver a tela de usuários'),
  ('users.edit',           'Usuários — Editar',              'Criar, editar e excluir usuários'),
  ('workers.view',         'Trabalhadores — Visualizar',     'Ver lista de trabalhadores'),
  ('workers.edit',         'Trabalhadores — Editar',         'Criar, editar e excluir trabalhadores'),
  ('holidays.view',        'Feriados — Visualizar',          'Ver lista de feriados'),
  ('holidays.edit',        'Feriados — Editar',              'Criar, editar e excluir feriados'),
  ('vehicles.view',        'Veículos — Visualizar',          'Ver lista de veículos e despesas'),
  ('vehicles.edit',        'Veículos — Editar',              'Criar, editar e excluir veículos e despesas'),
  ('settings.view',        'Configurações — Visualizar',     'Ver configurações do sistema'),
  ('settings.edit',        'Configurações — Editar',         'Alterar configurações do sistema');

-- Re-connect ALL permissions to the Administrador group
INSERT INTO "_PermissionToPermissionGroup" ("A", "B")
SELECT p."id", pg."id"
FROM "Permission" p, "PermissionGroup" pg
WHERE pg."name" = 'Administrador';
