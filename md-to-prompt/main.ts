import { unified } from "https://esm.sh/unified@10.1.2";
import remarkParse from "https://esm.sh/remark-parse@10.0.1";
import remarkFrontmatter from "https://esm.sh/remark-frontmatter@4.0.1";
import remarkGfm from "https://esm.sh/remark-gfm@3.0.1";
import { Root } from "https://esm.sh/v115/mdast-util-from-markdown@1.3.0/lib/index";
import { toString } from "https://esm.sh/mdast-util-to-string@3.2.0";
import { Content } from "https://esm.sh/v115/@types/mdast@3.0.11/index~.d.ts";
import { toMarkdown } from "https://esm.sh/mdast-util-to-markdown@1.5.0";

const parseContent = (content: string) => {
  const file = unified()
    .use(remarkParse)
    .use(remarkFrontmatter)
    .use(remarkGfm)
    .parse(content);

  return file;
};

type MdNode = {
  type: "node";
  heading: string;
  level: number;
  content: MdTree[];
  parent: MdNode | null;
};

type MdLeaf = {
  type: "leaf";
  content: Content;
};

type MdTree = MdNode | MdLeaf;

const skipTypes = [
  "yaml",
  "html",
  "thematicBreak",
  // TODO: handle these?
  "table",
  // TODO: what is this node?
  "delete",
];

const attachToHeading = (ast: Root): MdTree => {
  const tree: MdNode = {
    type: "node",
    heading: "~root~",
    level: 0,
    content: [],
    parent: null,
  };

  let curr = tree;

  for (const node of ast.children) {
    if (node.type === "heading") {
      const heading = toString(node);
      const level = node.depth;

      while (curr.parent && curr.level >= level) {
        curr = curr.parent;
      }
      const newNode: MdNode = {
        type: "node",
        heading,
        level,
        content: [],
        parent: curr,
      };
      curr.content.push(newNode);
      curr = newNode;
    } else {
      // TODO: remove this?
      if (!skipTypes.includes(node.type))
        curr.content.push({
          type: "leaf",
          content: node,
        });
    }
  }

  return tree;
};

type SimpleMdNode = {
  heading: string;
  level: number;
  content: SimpleMdTree[];
};
type SimpleMdLeaf = string;
type SimpleMdTree = SimpleMdNode | SimpleMdLeaf;

const MAX_LENGTH = 256;

const mergeContent = (arr: SimpleMdTree[]): SimpleMdTree[] => {
  const acc = [] as SimpleMdTree[];

  for (const item of arr) {
    if (typeof item === "string") {
      const last = acc[acc.length - 1];
      if (
        acc.length > 0 &&
        typeof last === "string" &&
        last.length < MAX_LENGTH
      ) {
        acc[acc.length - 1] += item;
      } else {
        acc.push(item);
      }
    } else {
      acc.push(item);
    }
  }

  return acc;
};

const simplifyMdTree = (tree: MdTree): SimpleMdTree => {
  if (tree.type === "node") {
    return {
      heading: tree.heading,
      level: tree.level,
      content: mergeContent(tree.content.map(simplifyMdTree)),
    };
  } else {
    try {
      return toMarkdown(tree.content);
    } catch (err) {
      console.error("error", err);
      // TODO: remove this?
      console.error(tree.content);
      return "";
    }
  }
};

type FlatReference = {
  headings: string[];
  content: string;
};

const doFlattenTree = (
  tree: SimpleMdTree[],
  headings: string[]
): FlatReference[] => {
  return tree.flatMap((item) => {
    if (typeof item === "string") {
      return [
        {
          content: item,
          headings,
        },
      ];
    } else {
      const newHeadings = [...headings, item.heading];
      return item.content.flatMap((it) => doFlattenTree([it], newHeadings));
    }
  });
};
const flattenTree = (tree: SimpleMdTree, filename: string): FlatReference[] => {
  if (typeof tree === "string") {
    throw new Error("invalid tree");
  } else {
    return doFlattenTree(tree.content, [filename]);
  }
};

const processFile = async (filePath: string, fileName: string) => {
  const decoder = new TextDecoder("utf-8");
  const data = await Deno.readFile(filePath);
  const content = decoder.decode(data);
  const parsed = parseContent(content);
  const attached = attachToHeading(parsed);
  const simple = simplifyMdTree(attached);
  const flat = flattenTree(simple, fileName);
  return flat;
};

async function getNames(currentPath: string): Promise<string[]> {
  const names: string[] = [];

  for await (const dirEntry of Deno.readDir(currentPath)) {
    const entryPath = `${currentPath}/${dirEntry.name}`;

    names.push(entryPath);

    if (dirEntry.isDirectory) {
      names.push(...(await getNames(entryPath)));
    }
  }

  return names;
}

const convertFolder = async (folder: string, outName: string) => {
  const names = await getNames(folder);
  const all: FlatReference[] = [];

  for (const name of names) {
    if (name.endsWith(".md")) {
      const flat = await processFile(name, name);
      all.push(...flat);
    }
  }

  Deno.writeTextFileSync(
    "out/" + outName + ".json",
    JSON.stringify(all, null, 2)
  );
};

if (import.meta.main) {
  // const flat = await processFile("content.md", "useState.md");

  await convertFolder("docs/react", "react");
  await convertFolder("docs/clickhouse", "clickhouse");
  await convertFolder("docs/mdn", "mdn");
}
