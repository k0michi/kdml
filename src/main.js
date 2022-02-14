import Prism from 'prismjs';
import posthtml from 'posthtml';
import { parser } from 'posthtml-parser';
import { render } from 'posthtml-render';
import katex from 'katex';
import { escape, unescape } from 'html-escaper';
import { CodeJar } from 'codejar';

import './styles.css';
import 'katex/dist/katex.min.css';
import 'prismjs/themes/prism-tomorrow.css';

const blank = String.raw``;

function renderKDML(code) {
  const previewEl = document.querySelector('#preview');
  const titleEl = document.querySelector('#document-title');
  const parsed = parseKDML(code);
  const headIndex = parsed.findIndex(n => n.tag == 'head');

  if (headIndex != -1) {
    const head = parsed[headIndex];

    const title = findElement(head.content, 'title');
    titleEl.innerHTML = render(title.content);
    parsed.splice(headIndex, 1);
  }

  const html = render(parsed);
  previewEl.innerHTML = html;
}

function findElement(tree, tag) {
  for (const e of tree) {
    if (e.tag == tag) {
      return e;
    }
  }

  return null;
}

window.addEventListener('load', () => {
  const editorEl = document.querySelector('#editor');

  let jar = CodeJar(editorEl, (e) => { Prism.highlightElement(e) }, { tab: '  ' });

  jar.onUpdate(code => {
    renderKDML(code);
  });

  renderKDML(blank);
});

function parseKDML(string) {
  const result = posthtml()
    .use(kdmlParser)
    .process(string, { sync: true });

  return result.tree;
}

function kdmlParser(tree) {
  convert(tree);
}

function convert(tree, parent, depth = 1) {
  if (Array.isArray(tree)) {
    for (let i = 0; i < tree.length; i++) {
      if (tree[i].tag == 'section') {
        convert(tree[i].content, tree[i].tag, depth + 1);
      } else if (tree[i].tag == 'h') {
        tree[i] = convertH(tree[i], depth);
        convert(tree[i].content, tree[i].tag, depth);
      } else if (tree[i].tag == 'code') {
        tree[i] = convertCode(tree[i], parent);
      } else if (tree[i].tag == 'math') {
        tree[i] = convertMath(tree[i], parent);
      } else if (tree[i].tag == 'quote') {
        tree[i] = convertQuote(tree[i], parent);
        convert(tree[i].content, tree[i].tag, depth);
      } else {
        convert(tree[i].content, tree[i].tag, depth);
      }
    }
  }
}

function convertH(node, depth) {
  depth = Math.min(depth, 6);
  node.tag = `h${depth}`;
  return node;
}

function convertCode(node, parent) {
  const block = parent == 'section' || parent == null;
  const code = render(node.content);
  const lang = node.attrs?.lang;
  let content = code;

  if (Prism.languages[lang] != null) {
    content = parser(Prism.highlight(unescape(code), Prism.languages[lang], lang));
  }

  let className = null;

  if (lang != null) {
    className = `language-${lang}`;
  }

  if (block) {
    return {
      tag: 'pre',
      attrs: { class: className },
      content: {
        tag: 'code',
        attrs: { class: className },
        content
      }
    };
  } else {
    return {
      tag: 'code',
      attrs: { class: className },
      content
    };
  }
}

function convertMath(node, parent) {
  const block = parent == 'section' || parent == null;
  const math = render(node.content);
  const rendered = parser(katex.renderToString(unescape(math), { displayMode: block }));

  if (block) {
    return {
      tag: 'div',
      attrs: { class: 'math' },
      content: rendered
    };
  } else {
    return {
      tag: 'span',
      attrs: { class: 'math' },
      content: rendered
    };
  }
}

function convertQuote(node, parent) {
  const block = parent == 'section' || parent == null;

  if (block) {
    node.tag = 'blockquote';
  } else {
    node.tag = 'q';
  }

  return node;
}