import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

// Custom Rehype plugin to enforce nofollow & sponsored on outbound links
function rehypeExternalLinks() {
  return (tree) => {
    function visit(node) {
      if (node.type === 'element' && node.tagName === 'a' && node.properties && node.properties.href) {
        const href = String(node.properties.href);
        if (/^https?:\/\//i.test(href) && !href.includes('jichangzhinan.co') && !href.startsWith('http://localhost')) {
          node.properties.target = '_blank';
          const isCommercial = /aff|code=|\?r=|\/register\?|civetnet|speedworld|gsyvip|xingdaomeng|flycat|v2yun|sogoyun|u1s1|kosing|qqy|kuaili|jlyvip|1flyun|2maoyun|yuzoucloud|gntaff|vipaff|twilightaff|breezenetaff|dalaoyunaff|worryfreeaff|fireflyaff|flashleapaff|shandianshuaff|yunjiexianaff|liulianyunaff|shenxingaff|huanqiutiaff|invisibleaff|ladderaff|gcvipaff|wgetcloud\.ltd|sibker\.com|cyberguard\.best|ssyylf\.com|lingdongaff|wavenetaff|edgenovaaff/i.test(href);
          node.properties.rel = isCommercial ? 'nofollow sponsored noopener noreferrer' : 'nofollow noopener noreferrer';
        }
      }
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(visit);
      }
    }
    visit(tree);
  };
}

// https://astro.build/config
export default defineConfig({
  site: 'https://jichangzhinan.co',
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      filter: (page) => {
        const pathname = new URL(page).pathname;
        return !/^\/(404|search|draft)(\/|\.html|$)/.test(pathname);
      }
    }),
    mdx()
  ],
  markdown: {
    rehypePlugins: [rehypeExternalLinks],
    shikiConfig: {
      theme: 'github-dark-dimmed',
      wrap: true
    }
  },
  prefetch: true
});
