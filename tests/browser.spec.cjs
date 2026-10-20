const {test,expect}=require('@playwright/test');
const base='http://127.0.0.1:8000/';
test('Главная: реальный рейтинг и переключение',async({page})=>{
 await page.goto(base);
 await expect(page.locator('#ranking-top li')).toHaveCount(5);
 await expect(page.locator('#ranking-top li').first()).toContainText('Финляндия');
 await page.locator('#year-select').selectOption('2020');
 await expect(page.locator('#ranking-count')).toContainText('пересчитано');
});
test('Каталог: поиск, регион, пагинация',async({page})=>{
 await page.goto(base+'countries.html');
 await expect(page.locator('#countries-grid .card')).toHaveCount(12);
 await page.locator('#search-input').fill('Молдова');
 await expect(page.locator('#countries-grid .card')).toHaveCount(1);
 await expect(page.locator('#countries-grid')).toContainText('Молдова');
 await page.locator('#search-input').fill('');
 await expect(page.locator('#countries-grid .card')).toHaveCount(12);
 await expect(page.locator('#pagination button')).not.toHaveCount(0);
});
test('Карточка: значения, факторы и избранное',async({page})=>{
 await page.goto(base+'country.html?name=Finland');
 await expect(page.locator('#country-score')).toContainText('7,741');
 await expect(page.locator('.factor-row')).toHaveCount(6);
 await page.locator('#favorite-button').click();
 await expect(page.locator('#favorite-button')).toHaveAttribute('aria-pressed','true');
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('whr-favorites')||'[]'))).toContain('Finland');
});
test('Сравнение: две страны и третья',async({page})=>{
 await page.goto(base+'compare.html');
 await expect(page.locator('#compare-status')).toContainText('Финляндия');
 await expect(page.locator('#compare-table tbody tr')).toHaveCount(6);
 await page.locator('#compare-three').selectOption('Denmark');
 await expect(page.locator('#compare-table thead th')).toHaveCount(4);
});
test('Калькулятор и информация о факторах',async({page})=>{
 await page.goto(base+'factors.html');
 await expect(page.locator('#calculator-inputs input')).toHaveCount(6);
 await page.locator('#calculate-btn').click();
 await expect(page.locator('#calculator-result')).toContainText('Условный персональный индекс');
 await page.locator('[data-info="gdp"]').click();
 await expect(page.locator('#info-modal')).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.locator('#info-modal')).toBeHidden();
});
test('Об источнике: schema.org и страницы адаптируются',async({page})=>{
 await page.goto(base+'about.html');
 const meta=await page.locator('script[type="application/ld+json"]').textContent();
 expect(JSON.parse(meta)['@type']).toBe('Dataset');
 await page.setViewportSize({width:320,height:700});
 await page.locator('#menu-toggle').click();
 await expect(page.locator('#main-menu')).toBeVisible();
 await page.locator('#menu-toggle').click();
 await expect(page.locator('#main-menu')).toBeHidden();
});
test('No JS page errors in core navigation',async({page})=>{
 const exceptions=[];page.on('pageerror',e=>exceptions.push(e.message));
 for(const path of ['','countries.html','country.html?name=Finland','compare.html','factors.html','about.html']){
  await page.goto(base+path);
  await page.waitForTimeout(700);
 }
 expect(exceptions).toEqual([]);
});

test('Калькулятор: все веса нулевые не дают фиктивного результата',async({page})=>{
 await page.goto(base+'factors.html');
 await expect(page.locator('#calculator-inputs input[type="range"]')).toHaveCount(6);
 await page.locator('#calculator-inputs input[type="range"]').evaluateAll(inputs=>{
   for(const input of inputs){input.value='0';input.dispatchEvent(new Event('input',{bubbles:true}));}
 });
 await page.locator('#calculate-btn').click();
 await expect(page.locator('#calculator-result')).toContainText('задайте ненулевой вес');
});
test('Модальное окно: после Escape фокус возвращается на вызвавшую кнопку',async({page})=>{
 await page.goto(base+'factors.html');
 const trigger=page.locator('[data-info="gdp"]');
 await trigger.click();
 await expect(page.locator('#info-modal')).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.locator('#info-modal')).toBeHidden();
 await expect(trigger).toBeFocused();
});
test('Некорректный адрес карточки сообщает об ошибке без исключения',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'country.html?name=CountryThatDoesNotExist');
 await expect(page.locator('#country-status')).toContainText('Страна не найдена');
 expect(errors).toEqual([]);
});

test('Интерактивная карта: 143 реальные оценки, наведение и выбор страны',async({page})=>{
 await page.goto(base);
 await expect(page.locator('#map-status')).toContainText('143 стран');
 await expect(page.locator('#world-map-regions path')).toHaveCount(176);
 await expect(page.locator('.world-map__country--measured')).toHaveCount(143);
 await expect(page.locator('.world-map__marker')).toHaveCount(6);
 const finland=page.locator('#world-map-regions [data-country="Finland"]');
 await expect(finland).toHaveAttribute('data-score','7.741');
 const brazil=page.locator('#world-map-regions [data-country="Brazil"]');
 await brazil.hover();
 await expect(page.locator('#world-map-tooltip')).toBeVisible();
 await expect(page.locator('#world-map-tooltip-name')).toHaveText('Бразилия');
 await expect(page.locator('#world-map-tooltip-value')).toContainText('Оценка жизни:');
 await finland.focus();
 await expect(page.locator('#world-map-tooltip')).toBeVisible();
 await expect(page.locator('#world-map-tooltip-value')).toContainText('7,741');
 await finland.click();
 await expect(page.locator('#map-country-name')).toHaveText('Финляндия');
 await expect(page.locator('#map-country-link')).toHaveAttribute('href',/country\.html\?name=Finland/);
 await page.locator('#map-country-select').selectOption('Singapore');
 await expect(page.locator('#map-country-name')).toHaveText('Сингапур');
 await expect(page.locator('#world-map-markers [data-country="Singapore"]')).toHaveAttribute('data-score',/^[0-9.]+$/);
 await expect(page.locator('#map-country-link')).toHaveAttribute('href',/Singapore/);
 await page.locator('#world-map-regions [data-geo-name="Angola"]').hover();
 await expect(page.locator('#world-map-tooltip-value')).toHaveText('Нет данных в рейтинге 2024');
});
test('Карта на мобильном: выбор страны без необходимости точного касания по контуру',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 await page.goto(base);
 await expect(page.locator('#map-status')).toContainText('143 стран');
 await page.locator('#map-country-select').selectOption('Moldova');
 await expect(page.locator('#map-country-name')).toHaveText('Молдова');
 await expect(page.locator('#map-country-score')).not.toHaveText('—');
 await expect(page.locator('#world-map-viewport').evaluate(e=>e.scrollWidth>e.clientWidth)).resolves.toBe(true);
});

test('У карты одинаковая толщина границ при выборе, наведении и фокусе',async({page})=>{
 await page.goto(base);
 await expect(page.locator('#map-status')).toContainText('143 стран');
 await expect(page.locator('#world-map-svg > title')).toHaveCount(0);
 await expect(page.locator('#world-map-svg')).toHaveAttribute('aria-label',/Географическая карта/);
 const brazil=page.locator('#world-map-regions [data-country="Brazil"]');
 await brazil.hover();
 const afterHover=await page.evaluate(()=>{
  const keys=['Finland','Russia','Brazil','Moldova'];
  return keys.map(k=>{
   const e=document.querySelector('#world-map-regions [data-country="'+k+'"]');
   const style=getComputedStyle(e);
   return {name:k,width:style.strokeWidth,stroke:style.stroke,vectorEffect:style.vectorEffect};
  });
 });
 expect(new Set(afterHover.map(x=>x.width)).size).toBe(1);
 expect(new Set(afterHover.map(x=>x.stroke)).size).toBe(1);
 expect(afterHover.every(x=>x.vectorEffect==='non-scaling-stroke')).toBe(true);
 await page.locator('#map-country-select').selectOption('Moldova');
 const selected=page.locator('#world-map-regions [data-country="Moldova"]');
 const regular=page.locator('#world-map-regions [data-country="Brazil"]');
 const selectedWidth=await selected.evaluate(e=>getComputedStyle(e).strokeWidth);
 const regularWidth=await regular.evaluate(e=>getComputedStyle(e).strokeWidth);
 expect(selectedWidth).toBe(regularWidth);
 await selected.focus();
 expect(await selected.evaluate(e=>getComputedStyle(e).strokeWidth)).toBe(regularWidth);
 await expect(page.locator('#world-map-tooltip')).toBeVisible();
});

test('Крым входит в геометрию Украины, а не России',async({page})=>{
 await page.goto(base);
 await expect(page.locator('#map-status')).toContainText('143 стран');
 const assignment=await page.evaluate(()=>{
  const uk=document.querySelector('#world-map-regions path[data-country="Ukraine"]');
  const ru=document.querySelector('#world-map-regions path[data-country="Russia"]');
  const point=new DOMPoint(595,132.3333333);
  return {ukraine:uk.isPointInFill(point),russia:ru.isPointInFill(point),ukrainianScore:uk.dataset.score};
 });
 expect(assignment.ukraine).toBe(true);
 expect(assignment.russia).toBe(false);
 await page.locator('#map-country-select').selectOption('Ukraine');
 await expect(page.locator('#map-country-name')).toHaveText('Украина');
 await expect(page.locator('#map-country-score')).not.toHaveText('—');
 await expect(page.locator('#map-country-link')).toHaveAttribute('href',/name=Ukraine/);
});

test('Крым: точное наведение показывает Украину, без кешированной карты',async({page})=>{
 await page.setViewportSize({width:1280,height:850});
 await page.goto(base+'?check=crimea-ukraine-20261020-v2');
 await expect(page.locator('#map-status')).toContainText('Крым отображается как часть Украины');
 const crimea=page.locator('#world-map-markers [data-crimea="Ukraine"]');
 await expect(crimea).toHaveAttribute('data-country','Ukraine');
 await expect(crimea).toHaveAttribute('aria-label',/Крым — Украина/);
 await expect(crimea).toHaveAttribute('data-score',/^[0-9.]+$/);
 const noStore=await page.evaluate(async()=>{
  const response=await fetch('./data/world-map.json?v=crimea-ukraine-20261020-v2',{cache:'no-store'});
  const json=await response.json();
  return {ok:response.ok,meta:json.crimea?.key,revision:response.url};
 });
 expect(noStore.ok).toBe(true);
 expect(noStore.meta).toBe('Ukraine');
 expect(noStore.revision).toContain('crimea-ukraine-20261020-v2');
 // Scroll to map viewport and convert the Crimean peninsula coordinate
 // from SVG user space into a real client pixel for pointer hit testing.
 await page.locator('#world-map-viewport').scrollIntoViewIfNeeded();
 const hit=await page.evaluate(()=>{
  const svg=document.querySelector('#world-map-svg');
  const pt=new DOMPoint(595,132.333333);
  const view=pt.matrixTransform(svg.getScreenCTM());
  const elem=document.elementFromPoint(view.x,view.y);
  return {country:elem?.closest('[data-country]')?.dataset.country,
          crimea:elem?.closest('[data-crimea]')?.dataset.crimea,
          visible:!!elem,x:view.x,y:view.y};
 });
 expect(hit.visible).toBe(true);
 expect(hit.country).toBe('Ukraine');
 expect(hit.crimea).toBe('Ukraine');
 await page.mouse.move(hit.x,hit.y);
 await expect(page.locator('#world-map-tooltip')).toBeVisible();
 await expect(page.locator('#world-map-tooltip-name')).toHaveText('Крым — Украина');
 await expect(page.locator('#world-map-tooltip-value')).toContainText('Оценка жизни:');
 // Recompute the exact screen coordinates after hover: sticky header resize
 // and scroll adjustment can move the SVG in WebKit between pointer events.
 await page.waitForTimeout(300);
 const fresh=await page.evaluate(()=>{
   const svg=document.querySelector('#world-map-svg');
   const p=new DOMPoint(595,132.333333).matrixTransform(svg.getScreenCTM());
   const region=document.elementFromPoint(p.x,p.y)?.closest('[data-country]');
   return {x:p.x,y:p.y,country:region?.dataset.country};
 });
 expect(fresh.country).toBe('Ukraine');
 await page.mouse.click(fresh.x,fresh.y);
 await expect(page.locator('#map-country-name')).toHaveText('Украина');
 await expect(page.locator('#map-country-link')).toHaveAttribute('href',/name=Ukraine/);
});
