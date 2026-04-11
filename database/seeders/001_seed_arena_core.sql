-- 001_seed_arena_core.sql
-- Seeds core arena + player + marker baseline from homepageData.json.

INSERT INTO arena (id, code, name, map_version, status)
VALUES (1, 'SHUTTER_ISLAND', 'Project Shutter Island Arena', 'v1', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO player (id, code, display_name, initials, role, primary_color, avatar_image_url)
VALUES
  (1, 'TARIQ_NASR', 'Tariq Nasr', 'TN', 'ENDURANCE', '#A4303F', '/players/tariq-nasr.jpg'),
  (2, 'SERA_MIKKELSEN', 'Sera Mikkelsen', 'SM', 'AGILITY', '#b07030', '/players/sera-mikkelsen.jpg'),
  (3, 'DARIO_VALE', 'Dario Vale', 'DV', 'STRATEGY', '#45B06C', '/players/dario-vale.jpg'),
  (4, 'YARA_CROSS', 'Yara Cross', 'YC', 'STEALTH', '#870058', '/players/yara-cross.jpg'),
  (5, 'FELIX_OSEI', 'Felix Osei', 'FO', 'STRENGTH', '#3a6fa0', '/players/felix-osei.jpg')
ON CONFLICT (id) DO NOTHING;

INSERT INTO arena_marker (arena_id, marker_code, label, x, y, color, meta)
VALUES
  (1, 'M_T_NASR', 'T.NASR', 148, 138, '#A4303F', '{"labelDx":9,"labelDy":-5}'::jsonb),
  (1, 'M_S_MIKK', 'S.MIKK', 220, 155, '#b07030', '{"labelDx":8,"labelDy":-5}'::jsonb),
  (1, 'M_D_VALE', 'D.VALE', 182, 252, '#45B06C', '{"labelDx":8,"labelDy":-5}'::jsonb),
  (1, 'M_Y_CROSS', 'Y.CROSS', 118, 210, '#870058', '{"labelDx":-32,"labelDy":-5}'::jsonb),
  (1, 'M_F_OSEI', 'F.OSEI', 240, 300, '#3a6fa0', '{"labelDx":8,"labelDy":-5}'::jsonb)
ON CONFLICT (arena_id, marker_code) DO NOTHING;

INSERT INTO arena_obstacle (arena_id, obstacle_code, label, x, y, width, height)
VALUES
  (1, 'OBS_A', 'Northwest Block', 74, 76, 16, 12),
  (1, 'OBS_B', 'Northeast Block', 150, 66, 18, 10),
  (1, 'OBS_C', 'East Block', 168, 134, 14, 14),
  (1, 'OBS_D', 'Southwest Block', 84, 182, 14, 14),
  (1, 'OBS_E', 'Center Block', 114, 130, 12, 16)
ON CONFLICT (arena_id, obstacle_code) DO NOTHING;
