export const audit = (db, actor, action, target) =>
  db('audit_events').insert({ actor_id: actor || null, action, target_id: target || null });
