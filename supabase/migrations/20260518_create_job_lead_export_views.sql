create or replace view public.job_lead_exports as
select
  jl.job_id,
  jl.quality_tier,
  jl.created_at,
  coalesce(jl.country, '') as country,
  coalesce(nullif(jl.city, ''), '暂无') as city,
  case jl.industry_group
    when 'electronics_electrical' then '电子电器'
    when 'automotive_machinery' then '汽车汽配'
    when 'building_home' then '建材家居'
    when 'trade_wholesale' then '综合贸易批发'
    else coalesce(jl.industry_group, '')
  end as industry_group,
  trim(
    both ' |' from concat(
      coalesce(nullif(l.title, ''), ''),
      case
        when coalesce(nullif(jl.city, ''), '') = '' then ''
        else ' | ' || jl.city
      end
    )
  ) as company_page,
  case
    when coalesce(nullif(l.phone, ''), '') = '' then ''
    else '="' || replace(l.phone, '"', '""') || '"'
  end as phone,
  coalesce(nullif(l.source_url, ''), l.canonical_url, '') as facebook_link,
  case jl.industry_group
    when 'electronics_electrical' then 'electronics-electrical'
    when 'automotive_machinery' then 'automotive-auto-parts'
    when 'building_home' then 'building-materials-home'
    when 'trade_wholesale' then 'trade-wholesale-import'
    else coalesce(jl.industry_group, '')
  end as category_english,
  case jl.industry_group
    when 'electronics_electrical' then '电子/电气/半导体/PCB'
    when 'automotive_machinery' then '汽配/汽车配件/卡车配件'
    when 'building_home' then '建材/家居/五金/卫浴'
    when 'trade_wholesale' then '贸易/批发/进口/分销'
    else ''
  end as category_local,
  coalesce(
    nullif(
      (
        select string_agg(distinct keyword, ', ')
        from jsonb_array_elements_text(coalesce(jl.matched_keywords, '[]'::jsonb)) as t(keyword)
      ),
      ''
    ),
    coalesce(
      nullif(
        (
          select string_agg(distinct query_text, ' || ')
          from jsonb_array_elements_text(coalesce(jl.matched_queries, '[]'::jsonb)) as q(query_text)
        ),
        ''
      ),
      ''
    )
  ) as matched_keywords,
  regexp_replace(coalesce(l.summary, ''), E'[\\r\\n]+', ' ', 'g') as summary
from public.job_leads jl
join public.leads l on l.id = jl.lead_id;

create or replace view public.job_lead_export_sheet as
select
  country as "国家",
  city as "城市",
  industry_group as "行业组",
  company_page as "公司/页面",
  phone as "手机",
  facebook_link as "Facebook链接",
  category_english as "类目英文",
  category_local as "类目本地语言",
  matched_keywords as "命中关键词",
  summary as "摘要"
from public.job_lead_exports;
