import { Selector } from 'testcafe';

fixture('Wikipedia Random Page Test').page('https://en.wikipedia.org/wiki/Special:Random');

test('Follow first Wikipedia links until Philosophy or loop', async (t) => {
  const visitedPages = [];
  let steps = 0;
  const MAX_STEPS = 100;

  while (steps < MAX_STEPS) {
    const titleText = await getTitleText(t);
    if (titleText === 'Philosophy') {
      console.log('Philosophy reached');
      break;
    } else if (visitedPages.includes(titleText)) {
      console.log('Loop detected');
      break;
    } else {
      visitedPages.push(titleText);
    }

    const firstValidLink = await getFirstValidLink(t);
    const linkText = await firstValidLink.innerText;
    const linkHref = await firstValidLink.getAttribute('href');
    console.log(`Page: ${titleText} → ${linkText} (${linkHref})`);
    await t.click(firstValidLink);
    steps++;
  }
  console.log('Visited pages:', visitedPages.length);
});

const getTitleText = async (t) => {
  const title = Selector('#firstHeading');
  await t.expect(title.exists).ok({ timeout: 10000 });
  return await title.innerText;
};

const getFirstValidLink = async (t) => {
  const content = Selector('#mw-content-text');
  await t.expect(content.exists).ok({ timeout: 10000 });

  const firstValidLink = await content
    .find('p a')
    .filter((node) => {
      return (
        !node.closest('i') &&
        !node.closest('sup') &&
        !node.closest('.infobox') &&
        node.getAttribute('href')?.startsWith('/wiki/')
      );
    })
    .nth(0);
  await t.expect(firstValidLink.exists).ok({ timeout: 10000 });
  return firstValidLink;
};
