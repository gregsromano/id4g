-- On/off switch for a product's sale, flipped from the admin product editor.
-- Off means the regular price shows, while the sale price, sale shipping and
-- any dates stay saved for switching back on. On with no dates means the
-- sale simply runs until switched off. Defaults to true, so every sale that
-- exists today keeps behaving exactly as it does.
alter table products
  add column if not exists sale_enabled boolean not null default true;
