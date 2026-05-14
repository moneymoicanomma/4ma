alter table app.blog_posts
  drop constraint if exists blog_posts_check1;

alter table app.blog_posts
  add constraint blog_posts_published_summary_check
  check (
    status = 'draft'
    or char_length(btrim(description)) between 40 and 260
    or char_length(btrim(coalesce(seo_description, ''))) between 40 and 260
    or char_length(btrim(coalesce(social_description, ''))) between 40 and 260
  );
