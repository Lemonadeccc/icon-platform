自动化 Icon 管理平台
项目背景

- 原有使用 iconfont（iconfont 简单说来就是阿里的一个 icon 管理平台），目前绝大多数互联网公司，尤其中小厂（一些大厂的商业项目甚至都用这个）都是使用这个平台，但是这个平台更多是通用的管理 icon 功能，使用上有很多麻烦和重复的地方。
  - 不清楚 iconfont 常规使用方法，可以移步这篇文章https://juejin.cn/post/7187398501695750203
    业务遇到的问题：
- 问题主要存在于：
  - icon 引入要引入阿里 CDN url，这个 CDN 存在不稳定性（曾经有一次这个平台直接挂了很久，在业内当时是个大新闻）
    [图片]
  - 虽然可以用备用方案，将文件下载到本地，然后代码复制到项目的 <script> 中（也就是把原有 iconfont 注入的代码由远程下载，变为本地项目保存），依然存在着操作繁琐的问题，因为项目开发中 ui 会很频繁的增删 Icon 组件.
  - 当时我们的项目也受到 iconfont CDN 挂了的影响，并且 CDN 加载速度有时很不稳定，会影响这个项目的加载速度。
  - 基于以上两点，领导让我们想一个本地化，自动化的方案来解决这个问题。

解决方法
我们建立了一个自动化的 Icon 管理平台，让设计师自己上传 SVG Icon 文件，然后平台在线自动包装为 React 组件，然后上传给后端（这个后端你可以说自己做的，也算一个小全栈项目，例如用 next.js，或者你们 express,nest.js 这种后端框架，也可以说是公司后端帮忙处理的）。

后端将文件发往公司内部代码仓库 gitlab，然后触发 gitlab ,也就是公司内部的 CI/CD 流程，结果将 SVG Icon 库打包，打包完毕，将同步本地仓库代码到 npm 仓库或者本地的 npm 仓库（也就是这个 icon 组件最终表现为一个 npm 包），从而前端项目只要更新 npm 包即可更新到最新的与 UI 团队要求一致的 Icon 样式。

- 前端重新安装一来 icon 组件的 npm 包即可

并且这个平台可以增删改原有的 Icon 组件，前端团队也可以很好预览到 Icon 的效果。
自动化 Icon 思路
设计师选择 SVG 文件
↓
浏览器 FileReader 读取文件内容（text）(利用浏览器本身读取文件的能力，而不用依靠文件上传后端，增加效率)
↓
DOMParser 将 SVG 字符串转为 DOM
↓
提取 viewBox、path、fill/stroke、其他 tag
↓
生成 React 组件代码（字符串）
↓
POST 给后端保存成文件/commit
↓
触发 CI/CD 流程，自动打包，还涉及到（面试官干可能问到，自动生成 changelog，自动版本更新,自动 eslint,prettier 格式化的问题）
↓
可在平台设置自动更新到 npm，或者在平台手动发布

代码层面把上述流程跑一遍

核心：浏览器如何读取 SVG 内容并解析？

1. 读取文件
   也就是设计师如何上传，以下方法你任选其一面试中可以说(以单个文件上传举例，面试要问你多个文件怎么办，就是一个 for 循环的事)：

-> 直接使用 input 原生能力，点击上传
<input
  type="file"
  accept=".svg"
  onChange={handleUpload}
/>
React 写法：
function UploadSVG() {
const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
const file = e.target.files?.[0];
if (!file) return;

    // 这里你就可以 readAsText(file)
    processSvgFile(file);

};

return (
<input type="file" accept=".svg" onChange={handleUpload} />
);
}

// 这里通过 readAsText 方法能读取到上传的文件内容
function processSvgFile(file: File): Promise<string> {return new Promise(resolve => {
const reader = new FileReader();
reader.onload = () => resolve(reader.result as string);
reader.readAsText(file);
});
}

---

-> 隐藏 input + 点击任意区域触发（实际项目最常用 UI）
function UploadButton() {
const ref = useRef<HTMLInputElement>(null);

const onButtonClick = () => {
ref.current?.click();
};

const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
const file = e.target.files?.[0];
if (file) processSvgFile(file);
};

return (
<>
<button onClick={onButtonClick}>上传 SVG</button>
<input
ref={ref}
type="file"
accept=".svg"
style={{ display: "none" }}
onChange={onChange}
/>
</>
);
}

// 这里通过 readAsText 方法能读取到上传的文件内容
function processSvgFile(file: File): Promise<string> {return new Promise(resolve => {
const reader = new FileReader();
reader.onload = () => resolve(reader.result as string);
reader.readAsText(file);
});
}
这是最常用的实践：
看起来像按钮，底层依然是 input。

---

-> 拖拽上传（设计师最喜欢）
你可以纯浏览器实现：
function DragDropUploader() {
const handleDrop = (e: React.DragEvent) => {
e.preventDefault();
const file = e.dataTransfer.files?.[0];
if (file) processSvgFile(file);
};

return (

<div
onDragOver={e => e.preventDefault()}
onDrop={handleDrop}
style={{
        border: "2px dashed #aaa",
        padding: "40px",
        textAlign: "center",
      }} >
拖拽 SVG 到这里上传
</div>
);
}

// 这里通过 readAsText 方法能读取到上传的文件内容
function processSvgFile(file: File): Promise<string> {return new Promise(resolve => {
const reader = new FileReader();
reader.onload = () => resolve(reader.result as string);
reader.readAsText(file);
});
}
或者用更好用的库：

- react-dropzone

---

-> Clipboard 贴图上传（增强 UX）
支持直接 Ctrl+V 贴图：
// 监听粘贴事件
useEffect(() => {
const handlePaste = e => {
const file = [...e.clipboardData.files].find(f => f.type === "image/svg+xml");
if (file) processSvgFile(file);
};
window.addEventListener("paste", handlePaste);
return () => window.removeEventListener("paste", handlePaste);
}, []);

// 这里通过 readAsText 方法能读取到上传的文件内容
function processSvgFile(file: File): Promise<string> {return new Promise(resolve => {
const reader = new FileReader();
reader.onload = () => resolve(reader.result as string);
reader.readAsText(file);
});
}

那面试官问：“你为何不直接上传文件到后端？”
你可以这么回答：
我们的目标不是保存原始资源，而是生成 React 组件。
浏览器已经具备解析 SVG 的能力（FileReader + DOMParser），
所以前端读取文件内容、解析 path/viewBox、生成 React 组件代码，再发给后端即可。
好处是后端不需要解析文件，也无需存储文件，减少复杂度，提高效率。

2. 用浏览器原生 DOMParser 解析 SVG
   DOMParser 是浏览器内建 API，无需任何依赖。
   关于 DOMparser 的用法，简单来说就是可以把字符串转为 DOM,如下图：

[图片]
以下代码目的是 提取 viewBox 和 Svg 包裹的组件
// HTML 原生解析 SVG
const parseSvg = (svgText: string) => {
const parser = new DOMParser();
const doc = parser.parseFromString(svgText, "image/svg+xml");
const svgEl = doc.querySelector("svg");
if (!svgEl) throw new Error("❌ Not a valid SVG");

    const viewBox = svgEl.getAttribute("viewBox") || "0 0 48 48";

    const elements = [...svgEl.querySelectorAll("*")].filter((el) =>
      ["path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "g"].includes(
        el.tagName
      )
    );

    return { viewBox, elements };

};

3.  提取 path 等元素，去掉 fill / stroke
    去掉 fill / stroke 的原因是，我们想外界定义 color 属性来控制 svg 的颜色，fill 和 stroke 属性会将 svg 颜色写死。
    你可以遍历每个元素，把属性提取出来：
    function extractSvgElementsWithoutFillStroke(elements: Element[]) {
    return elements.map((el) => {
    const cleanedAttributes = [...el.attributes]
    .filter(
    (attr) =>
    attr.name !== "fill" &&
    attr.name !== "stroke" &&
    attr.name !== "fill-opacity" &&
    attr.name !== "stroke-opacity" &&
    attr.name !== "stroke-width"
    )
    .map((a) => `${a.name}="${a.value}"`)
    .join(" ");

        // 特殊情况：<g> 可能有内部节点，但你当前只需要平铺
        return `<${el.tagName} ${cleanedAttributes} />`;

    });
    }
    这会生成类似数据：
    ['<path d="M12 12L24 24" />', '<circle cx="10" cy="10" r="5" />']

4.  自动生成 React 组件字符串
    代码如下：
    // 构建 React Icon 组件代码
    const generateReactIcon = (
    name: string,
    viewBox: string,
    elements: string[]
    ) => {
    return `
    import { createIcon } from "@company/icon";

export const ${name} = createIcon({
  viewBox: "${viewBox}",
paths: (
<>
${elements.join("\n ")}
</>
)
});
`.trim();
};
最终生成类似代码，createIcon 这个方法，我们后面说，这是我们组件库的代码，用来将 SVG 包装为 React 组件, '@company/icon' 代表的是你们的组件导出的用来包装 SVG 组件为 React Icon 组件的库：
import { createIcon } from '@company/icon';

export const ArrowUp = createIcon({
viewBox: "0 0 48 48",
paths: (
<>
<path d="M12 12L24 6L36 12" stroke="currentColor" />
<path d="M24 6V42" stroke="currentColor" />
</>
)
});

---

5.  只传 React 组件字符串给后端（不传文件）
    很简单，发送请求即可:

          // —— 发送给后端保存 ——
          await fetch("/api/icons", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: componentName,
              code: reactCode,
            }),
          });

后端保存方式可以是：

- 直接写入仓库对应目录
- 提交到 Git
- 写入数据库
- 执行 CI pipeline 构建 + 发布 npm

---

技术难点

- 如何设计一个可以将 SVG 自动转化为 React 组件的方案
- 因为 Icon 组件经常跟文字在一起，如何设计的为 React Svg Icon 组件即支持原有 Svg 属性，还能支持跟字体最常见的属性，也就是 color 设置颜色，font-size 设置字体大小一样使用。（svg 本身不支持 color 和 font-size 属性）。
- 如何利用浏览器本身读取文件的能力，在线组装 Icon 组件，并且支持预览效果。

如何解决的技术难点：
先解决第一个问题
SVG 自动转化为 React 组件

先看一下正常的 icon 的 SVG 本身长什么样子。简单来说，一般情况都是 svg 标签包裹一个或者多个 path 标签
<svg width="20px" height="20px" focusable="false" stroke="currentColor" fill="none" viewBox="0 0 48 48">
<path d="M28.0527 4.41085C22.5828 5.83695 18.5455 10.8106 18.5455 16.7273C18.5455 23.7564 24.2436 29.4545 31.2727 29.4545C37.1894 29.4545 42.1631 25.4172 43.5891 19.9473C43.8585 21.256 44 22.6115 44 24C44 35.0457 35.0457 44 24 44C12.9543 44 4 35.0457 4 24C4 12.9543 12.9543 4 24 4C25.3885 4 26.744 4.14149 28.0527 4.41085Z" fill="none" stroke-width="4" stroke-linejoin="round">
</path>
</svg>
然后以上 svg 标签如何包裹。
先看组件的用法, 如何包裹上面的 SVG 组件，变为 React 组件呢？ 核心就是用 createIcon 方法，
import React from 'react';
import { createIcon } from '../createIcon';

export const IconChromeLine = createIcon({
iconProps: { useStrokeCurrentColor: true },
paths: (
<path
      xmlns="http://www.w3.org/2000/svg"
      d="M24 15C28.9706 15 33 19.0294 33 24C33 28.9706 28.9706 33 24 33C19.0294 33 15 28.9706 15 24C15 19.0294 19.0294 15 24 15ZM24 15H41.8654M17 42.7408L29.6439 31M6 15.2717L16.8751 29.552M24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44Z"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
),
});

createIcon 实现
这个组件的一些灵感来源于 chakra ui,是国外一个很著名的组件库。
import React, { forwardRef } from 'react';
import { Icon } from './icon';
// type
import type { IconProps } from './interface';

interface CreateIconOptions {
/\*\*

- If the has a single path, simply copy the path's `d` attribute
  \*/
  paths: React.ReactNode;
  /\*\*
- Default props automatically passed to the component; overridable
  \*/
  iconProps?: IconProps;
  viewBox?: string;
  }

export function createIcon(options: CreateIconOptions) {
const { paths, iconProps = {}, viewBox = '0 0 48 48' } = options
return forwardRef<SVGSVGElement, IconProps>((props, ref) => (
<Icon ref={ref} viewBox={viewBox} {...iconProps} {...props}>
{paths}
</Icon>
));
}
代码中引用了 Icon 组件，我们后续说具体实现，目前我们主要看到的是， createIcon 主要提供了传入 svg 内容的 paths（本质上是插入到 svg 元素的子元素中）
还有一个就是 viewBox,因为不同 svg 网站的图标 viewBox 经常不一致。最后 iconProps 我们在后续的 Icon 组件参数中说明。

上面的代码引用了 Icon 组件，我们接着看看 Icon 组件的逻辑
Icon 组件
Icon 组件内容不多，也很简单，我们来看看：
import React, { PropsWithChildren, forwardRef } from 'react';
import { IconProps } from './interface';
import { getSize } from './utils';

const defaultProps = {
size: '1em',
};

export const Icon = forwardRef<SVGSVGElement, PropsWithChildren<IconProps>>((baseProps, ref) => {
const mergeProps = { ...defaultProps, ...baseProps };
const { className, size, style, children, useStrokeCurrentColor, useFillCurrentColor, ...rest } = mergeProps;
const [width, height] = getSize(size);
return (
<svg
ref={ref}
className={className}
width={width}
height={height}
style={style}
focusable="false"
stroke={useStrokeCurrentColor ? 'currentColor' : 'none'}
fill={useFillCurrentColor ? 'currentColor' : 'none'}
{...rest} >
{children}
</svg>
);
})
这里有两个细节，是需要注意的：

1. Icon 组件的 size 默认值是 1em，这是为了方便使用 font-size 来控制图标大小。你要知道，svg 元素本身是不支持使用 font-size 来控制图标大小的，但是我们可以使用 width 和 height 来控制图标大小。 当我们将 width 和 height 都设置为 1em 时，图标就会根据 font-size 来改变大小(em 是 css 里的相对长度单位，它参考当前元素的 font-size 控制大小)。又因为 font-size 是可以继承的，所以我们可以在 Icon 组件的父元素中设置 font-size，来改变图标大小。

2. Icon 组件的 useStrokeCurrentColor 和 useFillCurrentColor 这两个属性是为了方便使用 currentColor 来控制图标颜色，currentColor 关键字，让我们外部传入 css 颜色值，例如使用 css 颜色的关键字 red 就可以按照 css 的逻辑来改变颜色了。 再因为，Icon 往往有的需要 线框描边，不填充颜色，所以此时需要设置 useStrokeCurrentColor 为 true, 反之亦然。

可能还有的问题
为什么要用 SVG 做为 Icon

简单来说 SVG 已经是业内标准了，因为 SVG 缩放不失真，体积小。下面的文字看看就行了：

前端曾经流行过使用图片来做 icon, 并且由于 icon 数量一般都比较多，后来又流行一种叫做 雪碧图 的技术方案，也就是将多个图标放到一张图上， 这样可以减少 http 请求次数然后通过 background-position 来定位到所需要的具体图标。

图片大家都清楚，放大缩小是会失真的，而且 image 是属于 inline 元素(但是表现上跟 inline-block 更靠近)，所以会有一些间距问题。什么意思呢，你可以尝试使用 div 包裹一个 image 元素， 然后你会发现图片跟 div 元素下方是有一些空隙的，这就是这个方案的一个小坑。当然解决方案网上有很多，例如给 div 元素设置 font-size: 0，也可以将 image 元素 的 display 属性设置为 block 等等方法解决。

产生这个问题的本质是，inline 元素一般是基于基线（baseline）来对齐的（不是基于 bottom 对齐）, 所以基线跟真正的 div 的 bottom 之间是有空隙，

这个问题其实下面的 svg 方案也有，这下我们知道原理和解决方案就好说啦。

我们开始说说 svg 方案，svg 是矢量图，所以无论图标大小如何改变，相对于图片，svg 图标都不会失真。
svg 体积很小，浏览器原生支持，比图片肯定要小很多，然后天然支持 css 样式，所以我们可以直接在 svg 上添加 css 样式（需要经过一些特殊处理，就可以使用常用的 color 和 font-size 这两个 css 属性）。并且天然跟很多动画库，例如 framer-motion、GSAP 可以进行很好的结合。

这些优点，基本上就让 svg 元素跟常规的字体使用方式一致了，这样的优势让 svg 的灵活性、实用性和易用性大大提升。

总结
这个项目把设计、前端、CI、组件库、npm 发布流程完全串联起来，实现了公司内部 icon 的高效协作与自动化流转，大幅提升 UI 规范一致性，消除重复劳动，是一个真正的前端工程化项目案例。

设计更通用的 Message 组件
注：这里只写了方案的思路，主要是应对面试，因为面试不太可能现场写代码，只会问思路。如果需要逐行解释我们的组件代码，随时跟我说，咱们视频交流好一些。
项目背景

- 问题:
- UI 样式个性化，增加企业独有的设计感和品牌感
  - 部分负责人要求现有的基于 ant-design/element-plus 中的样式要更有个性化，需要按照 UI 部门的要求改造，同时产品要求 message 组件必须增加倒计时效果，例如：
    [图片]
  - 为了满足后续产品可能提出的更多要求 ，已有的 element-plus 的 message 组件二次改造越来越困难，所以前端负责人要求我自研一套通用的 message 组件。
    技术难点
- 公司多个平台的 UI 风格不一致，所以 UI 团队针对不同的平台设计了单独的个性化样式，这就要求我们设计的消息组件不能跟样式耦合，为了更好的拓展性，我希望只能设计一个 headless 消息组件作为基座，在其基础上扩展不同平台的定制化样式。
  - 大致设计思路，支持如下调用方式：
    某个元素触发 onClick 事件，然后我们调用 add 方法触发弹窗，其中 content 参数支持自定义的弹框

onClick={() => {
Message.add({
...其它参数,
content: <自定义的 modal 样式弹框 />
});
}}

- 还原 ant-design/element-plus 中 modal / MessageBox 一些技术难点，例如
  - 高可拓展的数据结构
    - 自己查看了一些组件库源码，例如腾讯的 t-design，其 message 组件的逻辑相当混乱，我改造了更为清晰的用法, 后续在解决方案篇详细描述。
  - layout 动画
    - layout 动画简单举例来说，就是当弹出第一个 message 的时候，message 组件显示在窗口中，注意，当第二个 message 立马跟着出现的时候，第一个 message 会自己往下移动。效果可以在https://www.frontlight.tech/toast/example/tailwind-traditional-example 体验。
    - 这种动画效果是 ui 要求的，比 ant-design 和 element-plus 的动画更加有趣，也更加高级。（这种动画本质上叫 FLIP 动画，不借助框架，实现起来非常繁琐）
    - 借助了当前顶流 React 动画库 framer-motion（现在改名为 motion，并且增加了对 vue 版本的支持），实现了 layout 动画。
  - 暂停功能，原本默认 message 显示 3 秒后消失，我们要做到 hover 某个 message ，这条 message 就暂停消失，等 hover 移开当前 message 组件，
  - 增加倒计时功能。
    解决方案
    高可拓展的数据结构：
- 代码如下，可是看到整体逻辑清晰很多，创建就调用 add 方法，更新消息就调用 update 方法，关闭某个 message 组件就调用 remove 方法，如果要关闭所有当前弹框就调用 clearAll 方法。
  function useStore(defaultPosition: IPosition) {
  const [state, setState] = useState<MessageStates>([]);

  return {
  state,
  add: (noticeProps: MessageProps) => {
  // xxx
  },

      update: (id: number, options: MessageProps) => {
        // xxx
      },

      clearAll: () => {
        // xxx
      },

      remove: (id: number) => {
        // xxx
      },

  };
  }

export default useStore;

- 从而产品如果后续有其他需求，只需要增加一个对应的方法即可，拓展性更好
- 我们看看为什么说参考的腾讯的 t-design 的逻辑很混乱，我们更好呢,它们的代码如下，最直观的问题就是，很多逻辑写到一个文件里，维护很麻烦（一个文件最好负责一件事），可见大厂也有不少很水的程序员。。。。
  const MessageContainer: React.FC<MessageContainerProps> = (props) => {
  // xxx 代码省略

  useEffect(() => {
  // xxx
  }, []);

  return (
  xxx
  );
  };

function createContainer({ attach, zIndex, placement = 'top' }: MessageOptions): Promise<Element> {
// xxx
}

async function renderElement(theme, config: MessageOptions): Promise<MessageInstance> {
// xxx
}

function isConfig(content: MessageOptions | React.ReactNode): content is MessageOptions {
// xxx
}

const messageMethod: MessageMethod = (theme: MessageThemeList, content, duration?: number) => {
// xxx
};

// 创建
export const MessagePlugin: MessagePlugin = (theme, message, duration) => messageMethod(theme, message, duration);
MessagePlugin.info = xx
MessagePlugin.error = xx
MessagePlugin.warning = xx
MessagePlugin.success = xx
MessagePlugin.question = xx
MessagePlugin.loading = xx
MessagePlugin.config = xx

MessagePlugin.close = (messageInstance) => {
// xx
};

MessagePlugin.closeAll = (): MessageCloseAllMethod => {
// xx
};

export default MessageComponent;

layout 动画

自己之前完全没有使用过 framer-motion（意思是面试官不要过度问我这个库），简单看了一下官网，使用了 AnimatePresence 组件和 motion 组件
import { AnimatePresence,motion } from 'motion/react';

<AnimatePresence>
  <motion.div xxx 参数，实现动画>
  {state.map((toast, index) => (
    <ToastContainer
      key={toast.id}
      duration={props.duration}
      {...xxx message 组件弹框的参数}
    />
  ))}
  </motion.div>
</AnimatePresence>;

- 这里大概提一下的目的是显示出你不断关注新技术，新框架的特质。
- 其中当涉及到一个组件退出动画，一定要使用 AnimatePresence 组件，它就是专门处理退出动画的，其中 motion 组件，就是实现具体动画样式的组件，motion.div 表示的是模拟的是 div 的特性，也就是 div 是块级元素的特性。（保留基本的 html 元素的特征的基础上，还支持传入特有的框架动画参数），这就是 motion.span （增强 span 元素）,motion.p（增强 p 元素） ，等等 motion 组件提供的功能。

暂停功能

核心代码, 下面解释实现思路，这个实现很巧妙：

const [spentTime, setSpentTime] = useState(0);
const [hovering, setHovering] = useState(false);

useEffect(() => {
if (!hovering && duration > 0) {
const start = Date.now() - spentTime;
const timeout = setTimeout(
() => {
store.remove?.(id);
},
duration - spentTime,
);

    return () => {
      clearTimeout(timeout);
      setSpentTime(Date.now() - start);
    };

}

}, [duration, hovering]);

- useEffect 包裹的函数，是指组件 dom 加载完毕才触发，跟 vue 的 mount 函数作用一致。
- 首先声明了两个变量
  - const [spentTime, setSpentTime] = useState(0); 其中 spentTime 表示还剩多少时间，例如一个 message 组件，默认 3 秒后，自动消失，那么当其显示到 1 秒的时候，我们鼠标 hover 上去，就意味着我们要记录，当鼠标移开后，还有 2 秒组件才消失，这个 spentTime 就是记录还有几秒的变量
  - const [hovering, setHovering] = useState(false); hovering 变量记录是否鼠标 hover 上去了，当然是要在整个 message 组件外层监听 onMouseEnter ，表示鼠标 hover 上来了，所以我们要 setHovering(true)，反之移开就设为 false
- 现在我们来看 useEffect 中的逻辑

  - if (!hovering && duration > 0) 表示，如果没有 hover，并且 duration（duration 是传给 message 组件的一个参数，之前我们说 默认 3 秒 一个 message 组件显示完后消失，这个 duration 默认就是 3 秒，可以改 message 组件显示的时间）。
  - 然后
    const timeout = setTimeout(
    () => {
    store.remove?.(id);
    },
    duration - spentTime,
    );

  - 表示我们开启一个定时器，也就是在 duration - spentTime 时间之后， `store.remove?.(id);` 表示移除 这个 message 组件。因为 spentTime 初始化是 0 ，duration 默认是 3 秒，所以 duration - spentTime 意味着 3 秒之后，调用 store.remove?.(id); message 组件会消失。

- 接着我们看下关键点，当鼠标 hover 上去的时候，因为 hover 的值就会从 false 变为 ture（触发了 onMouseEnter 事件，这里我们会设置 setHovering(true) ）, 因为 上面的 useEffect 依赖了 hover 变量，意味着到 hover 变量发生变化时，会先触发 useEffect 中的 return 返回的逻辑，也就是如下逻辑
  return () => {
  clearTimeout(timeout);
  setSpentTime(Date.now() - start);
  };
  然后，再次执行 useEffect 中的逻辑。也就是
  if (!hovering && duration > 0) {
  const start = Date.now() - spentTime;
  const timeout = setTimeout(
  () => {
  store.remove?.(id);
  },
  duration - spentTime,
  );

      return () => {
        clearTimeout(timeout);
        setSpentTime(Date.now() - start);
      };

  }

所以我们先说， hover 变化之后,以下代码发生了什么
return () => {
clearTimeout(timeout);
setSpentTime(Date.now() - start);
};

- clearTimeout(timeout); 意味着 hover 先把之前的定时器清空，因为之前的定时器到 3 秒就要移除 message 组件。
- 然后 setSpentTime(Date.now() - start);，也就是记录剩下的时间，首先我们先看 useEffect 中最开始有这么一行代码 const start = Date.now() - spentTime, 也就是当 dom 加载完毕，我们首先就记录了当前 dom 加载完，当前的时间是什么，默认 spentTime 为 0 ，所以 start 第一次的值（dom 加载完毕的值）就是 Date.now()。
- 然后，假设过了 1 秒，鼠标移动到 message 组件，此时触发 return 返回的函数逻辑，也就是 setSpentTime(Date.now() - start); 触发， start 是刚开始 dom 加载完毕的时间，现在我们鼠标移动到 message 组件的时候 Date.now()就是移动到 message 组件的时间，所以它们相减，就是过了多久的时间。我们刚才说过了 1 秒，我们才 hover 上去，所以这里的 setSpentTime(Date.now() - start);相当于 setSpentTime(1);，1 代表 过了 1 秒。
- 上面说了， 过了 1 秒 hover 上去会先执行 return 里的函数我们刚才介绍了，接下来，会把 useEffect 函数里的内容再次执行，我们看看是什么逻辑。
  if (!hovering && duration > 0) {
  const start = Date.now() - spentTime;
  const timeout = setTimeout(
  () => {
  store.remove?.(id);
  },
  duration - spentTime,
  );

      return () => {
        clearTimeout(timeout);
        setSpentTime(Date.now() - start);
      };

  }
  此时 hovering 是 ture，所以!hovering 是 false，所以 if (!hovering && duration > 0)是不执行的，判断的结果不是 true，所以不执行。这里千万要注意，因为 if (!hovering && duration > 0)是不执行的，return 返回的函数是在 if 语句里的，也就是这一轮，没有注册 return 函数，也就是 hovering 再次变化的时候，就不会先执行 return 里的函数了。

那么接下来，我们刚才假设过了 1 秒后，鼠标移开，这意味着，触发 onMouseLeave 事件，那么在这个事件里，我们的组件（没有在这里写出来）会让 setHovering(false),也就是 hovering 值变为 false，这意味着 useEffecr 依赖的 hovering 参数又变化了，又会把之前的逻辑执行一遍。

useEffect 执行，意味着先执行之前注册的 return 返回的函数里的内容，但我们之前也说了，由于上一次 hovering 参数的变化，并没有执行 if 语句里的逻辑，导致 return 逻辑没执行，所以这里就不会执行 return 返回的函数内容。

那么鼠标移开后，hovering 由 false 变为了 true，再次执行 useEffect 逻辑。
if (!hovering && duration > 0) {
const start = Date.now() - spentTime;
const timeout = setTimeout(
() => {
store.remove?.(id);
},
duration - spentTime,
);

    return () => {
      clearTimeout(timeout);
      setSpentTime(Date.now() - start);
    };

}

- 首先 const start = Date.now() - spentTime;表示，当前时间减去 spentTime ，spentTime 我们刚才说了，假设过去 1 秒，所以现在值是 1 。
- 然后重新启动 setTimeout 计时器，这里注意，duration - spentTime,duration 默认是 3 秒，spentTime 我们刚才说了是 1 秒，所以 3-1 就是还剩 2 秒，定时器结束的时候会移除 message 框

说了这么多，这个函数实现还是非常巧妙了，巧妙利用了 useEffect 的机制！

增加倒计时功能
这个代码也有点绕，我简单说下逻辑
useEffect(() => {
if (!hover) {
const start = performance.now();
let animationFrame: number;

      const calculate = () => {
        cancelAnimationFrame(animationFrame);
        animationFrame = requestAnimationFrame((timestamp) => {
          // 计算从动画开始到现在经过的总时间(毫秒)
          // timestamp: requestAnimationFrame 回调函数接收的参数，表示当前帧开始绘制的时间戳(毫秒)
          // spentTime: 之前已经消耗的时间
          // start: 动画开始的时间戳
          const runtime = timestamp + spentTime - start;
          const progress = Math.min(runtime / (duration), 1);
          setPercent(progress * 100);
          if (progress < 1) {
            calculate();
          }
        });
      };

      calculate();

      return () => {
        cancelAnimationFrame(animationFrame);
      };
    }

}, [duration, spentTime, hover]);
为了更好理解，我们简化一下逻辑：
useEffect(() => {
if (!hover) {
const start = Date.now();
let timeout: number;

      const calculate = () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          const runtime = Date.now() - start + spentTime;
          const progress = Math.min(runtime / (duration), 1);
          setPercent(progress * 100);
          if (progress < 1) {
            calculate();
          }
        }, 100);
      };

      calculate();

      return () => {
        clearTimeout(timeout);
      };
    }

}, [durat

- 倒计时，本质是记录百分比，例如 duration 默认是 3 秒，也就是总时间 3 秒过后 message 消失，那么倒计时需要记录，当前过了百分之多少的时间，例如过了百分之 50，意味着过了 1.5 秒，为什么要转为百分比呢，因为我们倒计时在 dom 层面的显示，就是一个 width 属性，width 为 100%，那么这个 width 的长度就跟 message 一样长，如果是百分之 50，width 的一半，代表时间过了一半
- 既然要过了时间的百分比，我们知道分母是 3，因为 duration 是 3，所以现在需要知道分子是多少，我们接下来探讨分子计算的逻辑
- 每次调用 calculate 的时候，就会当前调用的时候 Date.now() 减去 message 组件加载完毕的 start （那时的 Date.now() ），意味着过了多久，但我们知道，之前有可能 hover 到 message 组件上，这会让 spentTime ，也就是 hover 的时候，已经过了多少时间有变化，当 hover 结束，意味着又要重新计时，我们不得不重新计时的时候，也就是重新记录过了多少时间的基础上，加上之前已经过了多少时间
- 所以公式就是 const runtime = Date.now() - start + spentTime;
- 剩下的逻辑就很好理解了，runtime / duration \* 100 就是进度的百分比了

设计更通用的 Modal/Drawer 组件

注：这里只写了方案的思路，主要是应对面试，因为面试不太可能现场写代码，只会问思路。如果需要逐行解释我们的组件代码，随时跟我说，咱们视频交流好一些。
项目背景

- 公司内部开发自己独立的组件库，一方面是要求 UI 个性化，增加企业独有的设计感和品牌感，另一方面 react 组件库调用 modal 或者 drawer 的方式在原本的项目极其繁琐，例如阿里的 ant design，字节的 arco design 等等国内所有主流 react 组件库都是如下方式, 必须把 <Modal> 组件写到代码中：
  import React, { useState } from 'react';
  import { Button, Modal } from 'antd';

const App: React.FC = () => {
const [isModalOpen, setIsModalOpen] = useState(false);

const showModal = () => {
setIsModalOpen(true);
};

return (
<>
<Button type="primary" onClick={showModal}>
Open Modal
</Button>
<Modal
        title="Basic Modal"
        open={isModalOpen}
      >

<p>Some contents...</p>
</Modal>
</>
);
};

export default App;
而负责人要求，这种弹框组件必须都支持用函数的方法调用，类似：
import React, { useState } from 'react';
import { Button } from '我们的组件库';
import { modalStore } from '创建好的 modal store'

const App: React.FC = () => {
return (
<>
<Button type="primary" onClick={()=> modalStore.add({ content: xx 传入自定义的 Modal 组件 });}>
Open Modal
</Button>
</>
);
};

export default App;
modalStore，如何创建的呢，modalStore 本质上有 增删改的方法，分别对 modal 组件进行增加，删除和更新操作。
类似 Message 组件的树结构，如下：
function useStore(defaultPosition: IPosition) {
const [state, setState] = useState([]);

return {
state,
add: (noticeProps: MessageProps) => {
// xxx
},

    update: (id: number, options: MessageProps) => {
      // xxx
    },

    clearAll: () => {
      // xxx
    },

    remove: (id: number) => {
      // xxx
    },

};
}

export default useStore;
并且，上面代码中
onClick={()=> modalStore.add({ content: xx 传入自定义的 Modal 组件 });}
这个 content 中可以自定义的 Modal 组件。

所以我们完成了第一个重要任务，就是 UI 跟我们组件解耦，这样项目设计师无论设计什么样的 Modal 组件，我们都可以完美适配。只需要改 content 适配不一样的 modal 组件即可。

接着，我们完善前端负责人给我们的第二个任务，函数式调用
大概封装的方式为， 使用：
const TModal = {
add({
title,
showCloseIcon = true,
...xxx 各种参数
}) {
const id = modalStore.add({
content: (
<TModalBox
title={title}
showCloseIcon={showCloseIcon}
showFooter={showFooter}
className={className}
contentClassName={contentClassName}
style={style}
onCancel={() => {
onCancel?.();
modalStore.remove(id);
}}
onOk={() => {
onOk?.();
}} >
{content}
</TModalBox>
),
onCancel: () => {
modalStore.remove(id);
},
});
return id;
},
};
注意上面的 content ，我们使用是一个叫做 TModalBox 的组件，这个组件无所谓是什么，反正就是在别的文件夹下创建的，然后满足我们 UI 设计师要求的样式的组件就行了。最终暴露在外部的组件叫 TModal

经过这样封装后，所以最终调用的方式就是
function App() {
return (
<Button
status="primary"
onClick={() => {
TModal.add({
title: 'Modal Alert',
content: 'This is a message!',
});
}} >
Open Modal
</Button>
);
}

这样就完成了负责人要求的第二个任务，函数式调用，并且跟组件样式解耦。

技术难点
Modal/Drawer 样式插槽化，交给更上层去定制

- 1、之前提到了，一个是 modal/ drawer 组件如何共享底层同一套增删改的逻辑，并且跟 UI 无关，这样可以完美解决公司要求的多种 UI 样式定制化的需求，并且后续 UI 修改，只需要修改 UI 层，不需要动我们的 核心逻辑（增删改查）
  函数式调用
- 2、第二个就是如何使用 函数式调用，而不是类似国内所有 react 组件库都需要把 modal/drawer 组件再写一遍，正如之前举例如下，增加了繁琐度：
  import React, { useState } from 'react';
  import { Button, Modal } from 'antd';

const App: React.FC = () => {
const [isModalOpen, setIsModalOpen] = useState(false);

const showModal = () => {
setIsModalOpen(true);
};

return (
<>
<Button type="primary" onClick={showModal}>
Open Modal
</Button>
<Modal
        title="Basic Modal"
        open={isModalOpen}
      >

<p>Some contents...</p>
</Modal>
</>
);
};

export default App;
其它难点

- 3、同时需要解决 Modal / drawer 组件库常见的技术难点，对齐 ant deisgn 的主要功能。也就是增加我们独有的，便捷的，可拓展的功能的同时，兼顾实用性。

解决方案
上面技术难点中的第一点和第二点我们在之前的描述中已经解释了如何解决，接下来比较难的就是解决上面技术难点中的第三点。
还原 ant design 功能涉及到的技术难点包括

- 如何处理滚动条
- 如何解决嵌套 modal
- 如何锁定焦点
  接下来我们一个一个解决

如何处理滚动条

- 为什么要处理滚动条样式？
  首先，，一般 modal 框弹出的时候，我们是不想页面还能滚动的，这个如何处理？通用做法就是给 body 设置 overflow:hidden，这样屏幕就能不滚动了。

但此时又出现一个问题，如果之前有滚动条，overflow: hidden 会导致滚动条消失，滚动条原本就占了一定宽度的，当消失的瞬间，宽度消失，那么意味着容器就会占据这部分消失的空间。 所以布局上就会有 抖一下 的感觉。

为了不让用户感知到这个过程，我们需要在 modal 弹出的时候，给 body 或者是你自定义的挂载容器的 style width 值需要减去滚动条的宽度。

什么意思呢？原本 body 假设宽 100px，滚动条宽 15px，它们共同组成了屏幕宽度 100px + 15px，当浏览器滚动条小时，此时屏幕 body 宽度因为 width:100%( div 元素的特性，自动 width 横向会撑满)，就会变为 100px + 15px，屏幕上就会抖动。

为了减少这个抖动 ，我们强制在出现 Modal/drawer 的时候，强制 body 的宽度就是原本的宽度，可以使用
// getScrollBarWidth 对于 body 而言，就是 window.innerWidth - document.body.clientWidth
const containerScrollBarWidth = getScrollBarWidth(container);

body.style.width = `calc(${
        body.style.width || "100%"
      } - ${containerScrollBarWidth}px)`;

这个问题解决了，又来一个问题，如何解决嵌套 modal/drawer，嵌套 modal 指向两个问题：

- 一个是如何弹框之后，还有弹框，多个弹窗，本身组件设计的时候如何解决
  如何解决嵌套 modal

  - 还记得我们的 useStore，也就是 modal/drawer 组件的 store 设计吗，注意看 state 是一个数组结构，天然就支持嵌套 modal，多一个弹窗，也就是数组 push 一个新的值而已
    function useStore(defaultPosition: IPosition) {
    const [state, setState] = useState([]);

  return {
  state,
  add: (noticeProps: MessageProps) => {
  // xxx
  },

      update: (id: number, options: MessageProps) => {
        // xxx
      },

      clearAll: () => {
        // xxx
      },

      remove: (id: number) => {
        // xxx
      },

  };
  }

export default useStore

- 另一方面就是刚才我们说了，弹出 modal/drawer 会给容器处理添加 overflow: hidden 样式，以及更改 width 值，那么什么时候恢复样式呢？是不是还不能是关闭 modal 的时候， 因为有可能是有多个 modal，只有关闭最后一个的时候，才需要恢复容器原先的样式。

这里的解决方案一般有两种，一种是例如 material ui，chakra-ui, 小米公司的 modal 组件，都是用一个数据结构保存所有 modal，然后每次关闭一个 modal，就去所有 modal 里找是否是最后一个 modal，如果是最后一个才恢复 body 原本的 style。

第二种是字节 arco design 的处理方法，还是比较巧妙的，我的组件库也学习了这种方式。

简单来说，第一个 modal 弹出的时候，我们检测 body 是否 overflow 等于 hidden，通常都是不等于，此时我们才会去做上面说的，设置 body 的 overflow 为 hiidden 并且设置 wdith，所以第一个弹窗进来的时候我们这样设置了，那么第二个进来的时候我们肯定会检测到 body 的 overflow 等于 hidden，那么我们就不去做任何事情。

等第一个 modal 关闭的时候，我们利用 useEffect 中 return 函数的作用，恢复之前 body 的样式即可。伪代码如下，代码解释的注释也在其中：

import { useEffect, useRef } from "react";
import { resetContainerStyle, setContainerStyle } from "../utils";

export function useOverflowHidden(
// 获取挂载的 dom 元素
getContainer: () => HTMLElement,
// 是否 🈲 body 滚动，有时候有的人想弹框之后，页面（body）还能滚动，我们就不要把逻辑写死
hidden: boolean
) {
// 用来记录是否是否需要恢复 body 的样式
const needResetContainerStyle = useRe(false);
// 用来记录最开始 body 本身的属性，在恢复 body 样式的时候有用
const originContainerStyle = useRef({});

useEffect(() =>
hidden
? setContainerStyle(xx 参数，用来设置 body 样式)
: resetContainerStyle(xxx 参数，用来恢复 body 样式);
return () => {
resetContainerStyle(xx 参数，组件卸载的时候，恢复 body 样式);
};
}, [getContainer, hidden]);
}
其中 setContainerStyle 的源码如下：
import { getScrollBarWidth } from './getScrollBarWidth';

/\*\*

- Hides the container's scroll bar
  _/
  export const setContainerStyle = ({ container, needResetContainerStyle, originContainerStyle }) => {
  if (container && container.style.overflow !== 'hidden') {
  /\*\*
  _ @zh 记录 container 的 style 属性, 因为后续要将 container.style.overflow 设为 hidden
  _ @en Record the container's style property, because I'll set container.style.overflow to hidden later
  _/
  const originStyle = container.style;

      /**
       * @zh 记录是否 container.style.overflow 被覆盖为hidden
       * @en Note whether container.style.overflow is overwritten as hidden
       */
      needResetContainerStyle.current = true;

      const containerScrollBarWidth = getScrollBarWidth(container);
      if (containerScrollBarWidth) {
        originContainerStyle.current.width = originStyle.width;
        container.style.width = `calc(${container.style.width || '100%'} - ${containerScrollBarWidth}px)`;
      }

      /**
       * @zh 设置container的overflow为hidden
       * @en Set container overflow to hidden
       */
      originContainerStyle.current.overflow = originStyle.overflow;
      container.style.overflow = 'hidden';

  }
  };

还有，为什么要：
hidden
? setContainerStyle(xx 参数，用来设置 body 样式)
: resetContainerStyle(xxx 参数，用来恢复 body 样式);
因为可能刚开始你设置 hidden 值为 true，表示不希望 modal 弹出的时候，页面（body） 能滚动，但此时弹框里有个按钮，希望点击一下，页面（body）又能滚动，所以特此设置了一个切换是否能滚动的变量来控制，就是 hidden 参数。

如何锁定焦点

- 什么是锁定焦点？
  当你打开 modal 的时候，在键盘上按下 tab 键，会出现 button 元素 focus 的状态。
  [图片]
  上图所示的 focus 状态，会在你按下回车键的时候触发这个按钮的 onClick 事件。而且你一直按 Tab 键，焦点只会在当前 Modal 框里，不会移除到 Modal 框外，这种 focus 状态锁定技术是需要解决的。

并且有些同学可能不了解 tabIndex,有兴趣的同学可以搜索一下，通过 tabIndex,我们可以让关闭按钮，也就是右上角的 x 也能获取焦点，我的组件库并没有处理这个细节，是因为按 ESC 键就可以关闭弹窗，这样做我感觉多此一举。

在网页中，模态框（Modal）、弹出层（Dialog）等组件出现时，通常希望用户的键盘焦点始终被限制在这个弹出层内部，防止按下 Tab 键后焦点跳出模态框、误操作到页面其他区域。这种机制被称为 “焦点陷阱（Focus Trap）”。

- 解决方案
  我们会用一段简单的代码来实现这个功能。后面会有详细的讲解。

function createFocusTrap(element) {
const focusableElements = Array.from(
element.querySelectorAll(
'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
)
);

let firstFocusableElement = focusableElements[0];
let lastFocusableElement = focusableElements[focusableElements.length - 1];

function handleKeyDown(event) {
if (event.key === "Tab") {
if (event.shiftKey && document.activeElement === firstFocusableElement) {
event.preventDefault();
lastFocusableElement.focus();
} else if (
!event.shiftKey &&
document.activeElement === lastFocusableElement
) {
event.preventDefault();
firstFocusableElement.focus();
}
}
}

element.addEventListener("keydown", handleKeyDown);
element.focus();
}
这段代码的核心目标，就是在指定的容器元素中创建这样一个焦点陷阱，让用户在使用键盘 Tab 或 Shift + Tab 切换焦点时，始终在容器内循环切换焦点。

核心分为三部分：

- 找到容器内所有可聚焦的元素 通过选择器筛选出 a、button、input、select、textarea 等常见可聚焦元素，以及显式设置了 tabindex 的元素，并将它们存入数组中，方便后续处理。

- 记录首尾焦点节点 取出第一个和最后一个可聚焦元素，分别用于判断焦点循环的“边界条件”。

- 拦截键盘事件，实现循环焦点 监听容器的 keydown 事件。当用户按下 Tab 键： 如果是 Shift + Tab 且当前焦点在第一个元素上，就阻止默认行为，让焦点跳到最后一个元素； 如果是普通 Tab 且当前焦点在最后一个元素上，就跳回第一个元素。 这样就实现了焦点在容器内部首尾循环，形成“焦点陷阱”。

在线代码编辑器功能
注：这个组件还是有点绕，有什么问题尽管交流

项目背景

- 公司的搭建了自己的物料组件库（也就是公司自己用的二次封装的业务组件，当然你也可以说是纯组件库项目，反正意思就是需要一个能在线编辑 demo 代码的功能），当时需要搭建一个官网，这个官网需要一个在线编辑 demo 代码的功能。然后自己从 0 到 1 实现了这个功能。

技术难点

- 字符串代码如何变为 React 组件？
- 如何拦截错误，把错误限制在 demo 这个沙箱，不让其冒泡影响到整个 React 应用。
- 如何在用户修改编辑器内容的时候，更新代码

整体代码思路解析

首先要有一个代码编辑器

文件地址：m-ui-headless/apps/react-pc-website/app/\_components/code-preview/components/js-preview/js-preview.tsx

使用的是 react-codemirror 库，作为编辑器
@uiw/react-codemirror // 编辑器库
@codemirror/lang-javascript // 支持 javascript 语言
代码如下：
import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { materialDark } from '@uiw/codemirror-theme-material';

import type { JsPreviewProps } from './interface';

import './js-preview.css';

export function JsPreview({ code, onChange, readOnly = false }: JsPreviewProps) {
return (
<CodeMirror
value={code.trim()}
theme={materialDark}
extensions={[javascript({ jsx: true })]}
readOnly={readOnly}
className="max-h-125 overflow-auto text-sm"
onChange={onChange}
basicSetup={{
        // 关闭代码折叠功能
        foldGutter: false,
        // 关闭自动补全功能
        autocompletion: false,
        // 关闭当前活动行高亮
        highlightActiveLine: false,
        // 关闭侧边栏（gutter）当前行高亮
        highlightActiveLineGutter: false,
        drawSelection: false,
      }}
/>
);
}

需要注意的地方

- value={code.trim()} 就是我们外部传入的 字符串的 react 代码，然后 trim 方法把字符串收尾空格去掉了。
- theme={materialDark} 用的暗黑的 ui 风格，这种风格在暗色和亮色可以通用，这样方面省事在网站换肤的时候编辑器也换肤（可以这么做 mx-design 就是这样做的，后来嫌麻烦就 t-ui 就只用了暗黑色了）
- extensions={[javascript({ jsx: true })]} ，开启支持 jsx 格式的高亮显示功能
- onChange={onChange} ：表示我们在编辑器编辑内容时的回调函数。这个后面会讲，主要是触发了将字符串转译为 react 代码 的过程（编辑器改变的支持字符串，并不能直接渲染为 react 组件，所以需要再 onChange 里把字符串转换为 react 代码）。

编辑器展开收起
其中编辑器的内容咋们支持展开和收起收起状态，借助了 motion/react 框架，思路很简单，例如展开，就是让动画从 height:0 变为 height:auto 即可。这里注意，原生动画是不支持 heigt:0 到 height:auto 的动画的，auto 必须是一个确切的值才行。如何处理呢？
原理大概如下（了解即可）

1. 设置 height: auto 并测量高度
   el.style.height = 'auto';
   const targetHeight = el.offsetHeight; // 获取 auto 状态下的实际高度

- 这里先让元素展开到自然高度。
- offsetHeight 会返回元素在当前渲染下的像素高度，是一个具体数值。

2. 设置回动画起始高度
   el.style.height = '0px';

- 先把元素高度设置为 0，作为动画起点。
- 这样浏览器可以计算 0px → targetHeight 的中间帧。

3. 强制浏览器重排（Reflow / Layout）
   el.offsetHeight; // 访问一下，强制浏览器刷新布局

- 这是关键步骤，浏览器需要知道“起始高度已经是 0”。
- 访问 offsetHeight 会触发 同步重排，保证后续动画能生效。
  为什么需要强制重排
  浏览器渲染 CSS 动画有个原则：
- 浏览器在计算动画时，会基于 当前已渲染的样式 和 最终目标样式。
- 如果你先设置 height: auto 测量高度，然后直接设置回 height: 0 再立即设置为目标高度，浏览器可能会把两次修改合并，导致动画 直接跳到结束状态，动画看不出来。
  强制重排的作用：告诉浏览器“先把 height: 0 渲染出来，然后再开始动画”。

4. 执行动画
   el.style.transition = 'height 0.3s';
   el.style.height = targetHeight + 'px';

- 浏览器看到从 0px → targetHeight 有过渡，就会执行动画。
- 动画结束后可以再把高度设置为 auto，保证内容动态变化时布局自适应：
  el.addEventListener('transitionend', () => {
  el.style.height = 'auto';
  });

如何让字符串变为 react 可运行的代码
核心代码在 /m-ui-headless/apps/react-pc-website/app/\_components/code-preview/hooks/useCodePreview.tsx

先简单描述一下字符串变为 javascript 代码的思路：举个例子：
const code = `  return a + b;`;

const fn = new Function('a', 'b', code);

console.log(fn(2, 3)); // 输出: 5
如上，我们知道 eval("1+1") 可以直接执行代码，但是 eval 运行时的作用域是当前代码的作用域，是有可能污染当前的变量的，所以我们采取用 Fuction 来执行字符串代码，以此做一个小的隔离沙箱。

这里简单介绍一下 function 运行字符串的原理，假设有这么一个函数，如下：
function a(c) {
// 假设 b 是从外部作用域获取的
const result = b + c;
return result;
}
你是可以用 new Function 的传入字符串的方式构造一个和上面 a 一样的函数的，构造方式为：
const a = new Function(
'b', // 第 1 个参数：对应外部注入的依赖
'c', // 第 2 个参数：对应函数逻辑里的参数
`  const result = b + c; 
    return result;`, // 最后一个参数：函数体字符串
);

// 然后这里的 a 函数，跟上面的 a 是一样的
也就是除了最后一个字符串参数是函数体，前面的都是参数。

而我们的代码实际上也是这样执行的，核心代码：/m-ui-headless/apps/react-pc-website/app/\_components/code-preview/utils/evalCode.ts

代码如下：
import type { ComponentType } from 'react';

export const evalCode = (code: string, dependencies: Record<string, any>): ComponentType => {
const args = [];
const argv: any[] = [];
Object.keys(dependencies).map((key) => {
args.push(key);
argv.push(dependencies[key]);
});
args.push(code || '');
return new Function(...args)(...argv);
};

我们来举个例子上面的代码实际上是这样的, 先看 evalCode 这个函数的各个参数，第一个参数 code（假设第一个参数是以下的字符串）:
import React, { useState } from 'react';

function App(){
const [count, setCount] = useState(1);

    const handleClick = () => setCount(count+1)

    return <div onClick={handleClick}></div>

}
第二个参数：dependencies，我们就可以传入 useState（也就是把外界引入的 useState 传入到 evalCode，evalCode 又把 useState 当做函数参数传入 ）,所以可以这样
// 引入真正的 useState ，传入到函数里面
import React, { useState } from 'react';
evalCode(
` // 传入函数体
import React, { useState } from 'react';

function App(){
const [count, setCount] = useState(1);

    const handleClick = () => setCount(count+1)

    return <div onClick={handleClick}></div>

}
`
useState, // 传入参数
)

好了上面的代码有问题，首先

- import 语法是不能再函数体内使用的，会报错，其实我们不 import 也无所谓，因为参数是外界已经传进来了，我们要把用户的 import 语法全部删掉。
- 之前也说了 react 的 jsx 语法，react 根本不认识，所以我们也需要一些工具把 jsx 语法变为 React.createElement()这种用 react 语法创建 dom 的方式，浏览器才认识，才能运行。
  所以后续讲的东西主要是两点
- 第一，如何去掉代码里不想要的东西，例如 'import xxx' 语法
- 第二，如何将 react 的 jsx 语法变为 react 本身创建 dom 的语法，这样才能在浏览器里生成浏览器支持的 dom 元素

做这些事的核心代码在：/m-ui-headless/apps/react-pc-website/app/\_components/code-preview/utils/generateElement.tsx

代码如下：
import React, { type ComponentType } from 'react';
import { babelTransform } from './transform';
import { compose } from './compose';
import { evalCode } from './evalCode';
import errorBoundary from './errorBoundary';
// type
import type { CodePreviewProps } from '../interface';

interface executeCodeProps {
input: string;
dependencies: CodePreviewProps['dependencies'];
errorCallback: (error: Error) => void;
}

const replaceUseStrict = (code: string) => code.replace('"use strict";', '');
const trimCode = (code: string) => code.trim().replace(/;$/, '');
const wrapReturn = (code: string) => `${code}; return App`;

export const generateElement = ({ input, dependencies, errorCallback }: executeCodeProps): ComponentType => {
const transformed = compose<string>(wrapReturn, replaceUseStrict, trimCode, babelTransform, trimCode)(input);

return errorBoundary(evalCode(transformed, { React, ...dependencies }), errorCallback);
};

这里我们先看这一行 evalCode(transformed, { React, ...dependencies })，这就是我们之前说的 evalCode，注意 evalCode 第二个参数是，其实传入的就是 React 和我们组件库的组件，所以你可以看到我们官网的案例，可以直接使用 react 的 api 和 t-ui 组件，就是这么来的，举例如下：
[图片]

如上，这个 TButton 哪里来的？其实就是我们参数在 evalCode 中传入了，之前我们说 useState 可以作为参数，那么，只要我们传入什么，都可以当做函数参数，所以我们的组件库的组件也不例外。

从上面的 function App 代码可以看到，我们是没有 import TButton 这个元素的，为什么还能正常运行，是因为我们自己内部已经传了。

我们接着看之前说的 evalCode ，其中第二个参数依赖项我们说明白了，接着看第一个参数：
evalCode(transformed, { React, ...dependencies })

- transformed 就是要执行的代码字符串，还是上图
  [图片]
  例如上面这个示例，要执行的代码是 function App ....，就是第一个参数。

这个参数我们要进行一些处理才能正常运行，那么需要哪些处理呢？

核心代码是：
const transformed = compose<string>(wrapReturn, replaceUseStrict, trimCode, babelTransform, trimCode)(input);
首先 compose 函数，意思很简单，例如
compose(函数 1，函数 2)(参数)
意思就是参数先传给函数 1 运行，运行返回的结果作为参数给函数 2，依次类推，最终返回函数 2 的结果。

继续
compose<string>(wrapReturn, replaceUseStrict, trimCode, babelTransform, trimCode)(input);
以上：

- wrapReturn，其实就是在传入代码的基础上，增加了一个 return App；的字符串
  例如之前我们的案例是传入了 function App(){ xxx} 这个函数，wrapReturn 加工后就是：
  function App(){ xxx}; return App;
  还记得这个字符串是作为 new Function 的第一个参数吗，合起来就是
  new Function(
  useState, // react 的参数，这里为了模拟，就传了一个 useState
  ...x, // 其它参数
  `function App(){ xxx}; return App;`
  )
  最终上面返回的函数等价于
  function evalCode(react 的当做参数传入。。。。，组件库的组件当做参数传入。。。) {
  function App(){xxxx 里面是 demo 的代码};
  return App;
  }
  接着看之前的代码：
  compose<string>(wrapReturn, replaceUseStrict, trimCode, babelTransform, trimCode)(input);
- wrapReturn : 给传入的字符串 demo 代码，增加 return App 字符串
- replaceUseStrict： 给传入的字符串 demo 代码，去掉 “use strict” 字符串（我忘了具体情景了，之前因为有这个字符串报错，因为函数里面增加 use strict 会让函数的一些表现跟正常函数不一样）
- trimCode：给传入的字符串 demo 代码去掉收尾空格
- babelTransform：使用 babel 将字符串代码转为 react 字符串代码
  babelTransform 是重点，我们讲一下，源码如下：
  import { transform } from '@babel/standalone';
  import RemoveImports from 'babel-plugin-transform-remove-imports';

export function babelTransform(input: string) {
const { code } = transform(input, {
presets: ['react'],
plugins: [[RemoveImports, { removeAll: true }]],
});
return code;
}

核心是借助了 '@babel/standalone' 这个库，它的 transform 方法，可以将 jsx 字符串，转为 react 本身语法的字符串，例如 以下 jsx 语法

<div>1</div>
能转为以下类似代码：
React.createElement('div', 1)
其中配置了 presets: ['react'], 这个参数，就是用来做这个事的，接着我们还使用了 babel-plugin-transform-remove-imports 插件，目的是用来清除传入字符串代码的 import语句。因为实际上我们依赖的参数都通过函数参数的方式传入了，用户写的import语句其实没什么作用。

先小结一下：

我们简单梳理一下之前的逻辑在继续：
首先我们写了一个字符串代码 function App(){xxx}，传递给我们的在线代码编辑器组件，然后这些字符串代码最终经过上面我们说的流程，变为了 React 代码，然后通过 new Function 支持执行字符串代码，将 React 代码执行了，最终渲染出组件。

这里继续解决两个问题:

- 如何将错误限制在我们这个 demo 内，而不要 demo 报错，整个应用崩溃
- 如何在编辑器代码更新的时候，组件也跟着更新

我们先来看如何处理报错：
如何处理报错
上面我看看到了一个组件代码是这样,位置在 /m-ui-headless/apps/react-pc-website/app/\_components/code-preview/utils/generateElement.tsx

import React, { type ComponentType } from 'react';
import { babelTransform } from './transform';
import { compose } from './compose';
import { evalCode } from './evalCode';
import errorBoundary from './errorBoundary';
// type
import type { CodePreviewProps } from '../interface';

interface executeCodeProps {
input: string;
dependencies: CodePreviewProps['dependencies'];
errorCallback: (error: Error) => void;
}

const replaceUseStrict = (code: string) => code.replace('"use strict";', '');
const trimCode = (code: string) => code.trim().replace(/;$/, '');
const wrapReturn = (code: string) => `${code}; return App`;

export const generateElement = ({ input, dependencies, errorCallback }: executeCodeProps): ComponentType => {
const transformed = compose<string>(wrapReturn, replaceUseStrict, trimCode, babelTransform, trimCode)(input);

return errorBoundary(evalCode(transformed, { React, ...dependencies }), errorCallback);
};

其中这行代码中 errorBoundary 是用户来处理错误的：
errorBoundary(evalCode(...上面已经讲了 evalCode 的逻辑), errorCallback);
我们看看 errorBoundary 是什么：
代码如下：
import React, { type ComponentType, Component } from 'react';

const errorBoundary = (Element: ComponentType, errorCallback: (error: Error) => void) => {
return class ErrorBoundary extends Component {
componentDidCatch(err: Error) {
errorCallback(err);
}

    render() {
      return typeof Element === 'function' ? <Element /> : React.isValidElement(Element) ? Element : null;
    }

};
};

export default errorBoundary;

这个本质上就是一个 react 本身内部支持的 error 处理组件，上面这种写法，你可以认为是官方建议的类似写法，其中

- componentDidCatch 这个 ErrorBoundary 类的方法，就是当组件报错，就会被这个方法拦截住（react 本身的机制）
  然后回调用我们传入 errorCallback 方法，这个方法是我们自定义的，我用来做什么呢？实际上我会将错误字符串赋值，什么意思呢，看如下代码：
  const errorCallback = (error: Error) => {
  setState({ error: error.toString(), element: undefined });
  };
  说白了就是让 state 的 error 属性有值，element 属性没值

为什么要这么写呢，

我们先看看看正常显示，也就是没有错误的组件是如何展示的。

const { state } = useCodePreview({ code: \_Code, dependencies, ...props });
const Element = state.element;

 <div>
        <>
          <ErrorMessage message={state.error} /> // 这里显示错误的字符串
          <div>
            <>{Element ? <Element /> : null}</> // 如果没错就显示正常的组件
          </div>
        </>
      </div>
简单来说，上面的 state的结构是这样
{
    error:xx,
    element: xx,
}
正常显示的时候，state.error 属性是undefined，state.element就是那个组件。

所以之前如果你想显示报错，就需要设置，state.error 属性是字符串（为了展示报错到页面上），state.element 设为 undefined 即可。

好了，报错解决了，接下来看看如何在编辑器内容变化的时候，我们的组件同步更新
组件同步更新

核心代码在：/m-ui-headless/apps/react-pc-website/app/\_components/code-preview/hooks/useCodePreview.tsx

简单来说，核心代码如下：
useUpdate 是一个 hook，简单来说就是组件初始化的时候什么也不做，只有当依赖更新的时候，才执行里面的函数。
useUpdate(() => {
if (code) {
transpileAsync(code).catch(onError);
}
}, [code, dependencies]);
所以注意 [code, dependencies],这里显示，只有两种情况会触发 useUpdate 中函数重新调用，一个是 code，就是我们传入的 demo 代码（字符串），另一个就是 dependencies，就依赖项，例如之前说的传给函数的 React 的各种方法，还有我们的 Ui 组件库的组件。

所以这里解开了代码编辑器更新内容，组件重新渲染的逻辑，就是这样，那么如何重新渲染呢？

我们使用了
transpileAsync(code).catch(onError);
核心在于 transpileAsync，这个函数说白了，就是之前执行我们的那个
evalCode(....)
evalCode 函数，也就是再一次将字符串编译为 react 字符串，然后 react 的字符串在 new Function 执行，变为浏览器端能执行的 dom 元素。

最终将结果再次给我们的 setState 更新，
{
error: 如果有 error 就只更新 error,
element: 把刚才更新好的元素赋到这里。
}

好了，整个渲染思路齐全了，面试足够了，这套讲下来，包括你介绍，面试官问和你答 ，再怎么也够 10 分钟以上了。

radio/checkbox 组件
注：这里只写了方案的思路，主要是应对面试，因为面试不太可能现场写代码，只会问思路。如果需要逐行解释我们的组件代码，随时跟我说，咱们视频交流好一些。
项目背景
公司 c 端经常会有很多 radio / checkbox 按钮，而这些按钮 ui 的要求并不是传统的如下的样式

[图片]

而是，要么是卡片：
[图片]

要么是酷炫的按钮：
[图片]
为此，我开发了一套通用的 radio.checkbox 组件，并且可以无缝融入到 ant design 的 form 表单中，让 ant design 的 form 表单也能收集我们开发的 radio/checkbox 组件数据。

技术难点
首先需要明确，radio 组件无非是完成了一个逻辑：在多个组件中只能同时选择一个。checkbox 组件无非是完成了一个逻辑：在多个组件中能同时选择多个，所以只要实现了这个逻辑，就相当于我们自己实现了浏览器层面的 radio/checkbox 组件！
接下来看看具体的技术难点：

- 如何在 ui 个性化的同时，保持原有语义化（也就是 radio/checkbox 组件依然存在，点击切换依然走原生事件）
- 如何设计组件结构，让原生事件 radio/checkbox 组件状态切换的数据接入到我们自己的 react 中定义的数据里，这样就能完成数据流层面的掌控，为 ui 个性化打下基础。
- 如何处理受控和非受控状态（不了解受控和非受控请参考我这篇文章https://juejin.cn/post/7579832417747484723）

我们拿 radio 组件举例，（checkbox 的逻辑类似）：先看看 radio 组件基本 html 结构
radio 组件基本结构
[图片]
观察上图可以发现，标准的 radio 组件通常包含两个部分：

- 左侧的圆圈图标（表示选中状态）
- 右侧的描述文字
在实际使用中，我们期望不仅点击圆圈可以选中，点击右侧文字也应该能触发选中。这个功能是如何实现的呢？关键在于 <label> 标签的巧妙运用。
方法一：MDN 推荐方式
<div>
    <input type="radio" id="huey" name="drone" value="huey" checked />
    <label for="huey">Huey</label>
</div>
实现要点：
- 在 input 上定义唯一的 id 属性
- 在 label 上设置对应的 for 属性
- 两者值匹配时，点击 label 即可选中关联的 radio
  缺点： 需要维护 input 上的 id 属性与 label 上的 for 属性对应关系，较为繁琐。
  方法二：嵌套包裹方式
  <label>
  <input type="radio" value="huey" />
  Huey
  </label>
  优势：
- 结构更简洁，无需维护 id 映射
- label 自动与内部的 input 建立关联
- 点击 label 内的任何区域（包括文字）都能触发 radio 选中
  了解完基本的结构后，我们开始先说一下触发 radio 选中的机制的完整流程。

这里我们介绍一下,以下涉及的事件流走向，这个是个容易起疑问的点：

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document</title>
  </head>
  <body>
    <label id="label">
      Do you like peas?
      <input id="input" type="checkbox" />
    </label>

    <script>
      label.addEventListener("click", () => console.log("label click"));

      input.addEventListener("click", () => console.log("input click"));

      input.addEventListener("change", () => console.log("input change"));
    </script>

  </body>
</html>

当点击，Do you like peas?，事件触发的顺序是如下图：
[图片]
可以看到，很有意思，label 的 click 事件竟然触发了两次，这是为什么？
① label click ← 用户真实点击 label 文本
② input click ← label 的默认激活行为触发
③ label click ← input click 冒泡回 label
④ input change ← input 状态变化后触发
第一次点击 label click ，会导致激活 input 的选中态，这个选中态会触发 input 的 click 事件，而 click 事件是有冒泡的，所以 input click 触发后会把 click 事件冒泡到 label，最后，input 激活态触发事件包含 click 和 change 事件，并且是先完成 click 然后是 change 事件的顺序。

为什么这个如此重要呢，后面的代码会在某些地方使用 禁止冒泡的方法，你才看的明白为什么要这么禁止。

接着，我们继续实验上面的案例，假如先点击 input 框呢？事件顺序触发如下：
[图片]

好了，到此为止，我们要讲一下，我们的 radio/checkbox 组件实现的思路：

状态切换的完整流程
可视化流程：
用户点击 Label
↓
触发 label.onClick
↓  
激活 radio/checkbox 的选中或者取消选中的状态
↓
触发 input.onClick
↓
冒泡到 label.onClick 事件
↓
触发 input.onChange
↓
更新选中状态 (value)

虽然整体逻辑看似清晰简单，但实际开发中隐藏着不少陷阱。我们将逐一剖析这些常见问题，一旦理解并规避了这些坑，您就能轻松实现一个健壮可靠的 radio 组件。

如何避免 label.onClick 两次触发？
上面我们可以看到， label.onClick 触发了两次，这个如何避免呢？我们的做法是在 <input type="radio"
onClick={(e) => {
// 阻止 input 的点击事件冒泡，避免重复处理
e.stopPropagation();
}}
/>
这样，如果点击 label 标签上的文字，事件流会变为
用户点击 Label
↓
触发 label.onClick
↓  
激活 radio/checkbox 的选中或者取消选中的状态
↓
触发 input.onChange
↓
更新选中状态 (value)

好了，我们把数据流理清楚之后，接着就是最关键的，如何在 上面 input.onChange 的时候，改变 radio/checkbox 的状态。

我们拿 radio 组件举例.，假设默认是没有选中的（应该支持用户自己传入是否选中（受控），或者默认是否选中（非受控））：
const [checked, setChecked] = useState(false);

const onChange = (e) => {
e.stopPropagation();

    // 禁用或只读都不改变状态，不触发外部 onChange
    if (disabled || readonly) return;

    if (context.group) {
      context?.onChangeValue?.(value, e);
    } else if (!('checked' in props) && !checked) {
      setChecked(true);
    }
    if (!checked) {
      propsOnChange?.(true, e);
    }

};

<input type="radio"
onChange={onChange}
onClick={(e) => {
// 阻止 input 的点击事件冒泡，避免重复处理
e.stopPropagation();
}}
/>
好了，至此我们把所有关注点切换到 onChange 事件，只要这个事件梳理完毕，radio 组件数据流就走通了。
const [checked, setChecked] = useState(false);
const onChange = (e) => {
e.stopPropagation();

     // 这里的 disabled 实际上是 props.disabled,也就是外部传入的，支持radio 是禁用态
     // 这里的 readonly 实际上是 props.readonly,也就是外部传入的，支持radio 是只读态
     // 注意 html 标准 radio/checkbox 是没有 readonly 状态的，是我们单独加的，因为业务上很常见
    // 禁用或只读都不改变状态，不触发 onChange
    if (disabled || readonly) return;

    // 这个后续讲，是如果有 Radio.Group组件包裹采用下面的逻辑
    if (context.group) {
      context?.onChangeValue?.(value, e);
    } else if (!('checked' in props) && !checked) {
      // 简单理解为，如果没有传 props.checked 属性，我们帮用户选中
      // 选中之后就无法改为未选中状态了，这个符合原生的 radio 组件的交互
      setChecked(true);
    }
    if (!checked) {
      // 触发外部 props.onChange 事件，将选中的状态传递出去，有时候用户需要在选中的时候做一些事
      propsOnChange?.(true, e);
    }

};

以上对于 radio 组件就出来了，但实际作用不大
[图片]
因为，radio 和 checkbox 更重要的是能切换，所以我们接下来聚焦一下 radio.group 组件，将这些 radio 组件包裹起来，完成切换功能，使用方式如下：
<Radio.Group defaultValue="2" className="flex gap-4 flex-wrap">
<Radio.root value="1">Option 1</TRadio>
<Radio.root value="2">Option 2</TRadio>
<Radio.root value="3">Option 3</TRadio>
</Radio.Group>
Radio Group 组件逻辑

我们梳理一下 Radio Group 组件 的数据流，这里介绍一个 react 的 api,叫 Context api，使用这个 api 可以将某个组件的任何数据或者方法传递给子组件。
例如我们组件库的 Radio Group 的 jsx 结构如下

<div role="radiogroup" {...rest}>
    <RadioGroupContext.Provider
      value={{
        onChangeValue,
        type,
        value,
        disabled,
        readonly,
        group: true,
        name,
      }}
    >
      {children}
    </RadioGroupContext.Provider>
  </div>
可以看到，实际上是有一个 RadioGroupContext.Provider，就是 这个 Context api的使用，其它地方只需要
import { useContext } from 'react';
import {RadioGroupContext} from '..这个context存放的文件路径'
const {onChangeValue, type, value ....等等 RadioGroupContext.Provider 中传递的数据} = useContext(RadioGroupContext)

好了继续梳理数据流：
Radio Group 传递 onChangeValue 和 value，简化逻辑如下，实际上是把一个共享的 value，共享的 onChangeValue 方法给了所有的子 Radio 组件
const [value, setValue] = useState(props.value);

// functions
const onChangeValue = (v: any, event): void => {
if (v === value) return;

    if (!('value' in props)) {
      setValue(v);
    }

};

  <div role="radiogroup" {...rest}>
    <RadioGroupContext.Provider
      value={{
        onChangeValue,
        type,
        value,
        disabled,
        readonly,
        group: true,
        name,
      }}
    >
      {children}
    </RadioGroupContext.Provider>
  </div>
所以组件选中逻辑就是，onChangeValue(当前 radio组件的value)，可能有点懵，看如下：
 <Radio.Group defaultValue="2" className="flex gap-4 flex-wrap">
      <Radio.root value="1">Option 1</TRadio>
      <Radio.root value="2">Option 2</TRadio>
      <Radio.root value="3">Option 3</TRadio>
    </Radio.Group>
onChangeValue(2)，就代表  <Radio.root value="2">Option 2</TRadio> 的值传入了，所以当前选中的值就是 2，所以切换 radio 的逻辑也很简单了，onChangeValue(xxx)，其中xxx就是你点击的Radio 组件的值。

还记得 Radio 组件的 onChange 方法中有如下逻辑吗? 注意下面的 context.group，这个值 之前的 RadioGroupContext.Provider 传了 true，表示此时 radio 组件被 Radio Group 组件包裹了，所以状态切换交给 Radio Group 接管，radio 就不用管了：
const [checked, setChecked] = useState(false);
const context = useContext(RadioGroupContext);

const onChange = (e) => {
//...省略代码
if (context.group) {
context?.onChangeValue?.(value, e);
} else if (!('checked' in props) && !checked) {
setChecked(true);
}
//...省略代码
};

<input type="radio"
onChange={onChange}
onClick={(e) => {
// 阻止 input 的点击事件冒泡，避免重复处理
e.stopPropagation();
}}
/>

好了，至此我们就讲解清楚了整个 radio 组件的数据流，checkbox 组件是类似的。

如何处理受控和非受控组件
参考以下文章https://juejin.cn/post/7579832417747484723，有详细讲解，通过如下useMergeValue hook，来合并受控和非受控状态，这个 hook 是字节 arco design 官方的 hook，ant design ，tdesign 也有类似的 hook：
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { isUndefined } from '../utils';
import { usePrevious } from './use-previous';

export function useMergeValue<T>(
defaultStateValue: T,
props?: {
defaultValue?: T;
value?: T;
},
): [T, React.Dispatch<React.SetStateAction<T>>, T] {
const { defaultValue, value } = props || {};
const firstRenderRef = useRef(true);
const prevPropsValue = usePrevious(props?.value);

const [stateValue, setStateValue] = useState<T>(
!isUndefined(value) ? value : !isUndefined(defaultValue) ? defaultValue : defaultStateValue,
);

// 受控转为非受控的时候，需要做转换处理
useEffect(() => {
if (firstRenderRef.current) {
firstRenderRef.current = false;
return;
}
if (value === undefined && prevPropsValue !== value) {
setStateValue(value);
}
}, [value]);

const mergedValue = isUndefined(value) ? stateValue : value;

return [mergedValue, setStateValue, stateValue];
}

更通用的 Anchor 组件

注：这里只写了方案的思路，主要是应对面试，因为面试不太可能现场写代码，只会问思路。如果需要逐行解释我们的组件代码，随时跟我说，咱们视频交流好一些。
项目背景
公司多个前端内部项目需要一个如下的导航的 Anchor 组件：
[图片]

但目前市面上组件库的 anchor 组件分为两种实现思路：

- 一种借助原生锚点的功能，也就是当你的 url 上存在 #xxx, 例如 url 尾部有#基础使用，并且你的页面有一个元素的 id 叫基础使用，例如
// url: http://www.baidu.com#基础使用
// html 页面存在元素
<div id="基础使用">标题：基础使用</div>
那么当你输入url的时候，浏览器会自动帮你定位到 <div id="基础使用">标题：基础使用</div>  这个dom 元素的位置，同理当你有一个按钮 <a href ="#基础使用">点我跳转</a>,那么点击这个 a 标签，也会自动帮你定位到<div id="基础使用">标题：基础使用</div>  这个dom 元素的位置。

- 另一种是自己实现，例如你点击元素 <span target-id="基础使用">，并且页面存在：<div id="基础使用">标题：基础使用</div> 元素，此时点击这个 span，我们绑定一个 onClick 事件到这个 span，如果点击，那么我们能找到这个 span 上的 target-id 属性叫 基础使用，然后然后通过 document.querySelector(‘#基础使用’) 就能获取到页面中存在的这个 <div id="基础使用">标题：基础使用</div> 元素然后调用
  document.getElementById("#基础使用").scrollIntoView()
  也就是 scrollIntoView 方法，就能自动跳转到页面的这个元素上了。

但是上面自己实现的这种方式，无法解决给用户一个 url，用户在浏览器输入并按下回车，就能自动跳转到对应<div id="基础使用">标题：基础使用</div> 的功能。

这是市面上两种实现，而我们的实现是在上面第二种的基础上，增加很多非常必要的功能。一个就是支持用户输入 url，我们能跳转到对应 dom 元素上，支持原生的功能。第二，原生功能有个非常大的问题，就是只能支持跳转到某个元素的顶部，这个元素顶部会跟浏览器的顶部对齐，我们往往可能需要留点空间会好看一点，尤其是你们的项目页面头部还有 fixed 定位的元素的话，例如这个飞书文档的头部，会随着滚动而一直在头部保持，那么这个锚点跳转功能就很很坑了，dom 对齐浏览器顶部意味着被遮挡住了。

以上既支持原生输入 url 跳转到对应 dom 能力的 Anchor 组件，又支持上面所说的第二种自定义实现的方式增加更多功能的 Anchor 组件并不存在，所以我们研发了自己的 Anchor 组件。

最后原生的锚点跳转，还不支持在某个容器内部跳转，例如一个容器 div 在页面中，有自己的滚动条，我们想点击元素，跳转到这个容器内部的某个 dom 节点中，原生也是不支持的。详细原生能力请看如下文章（刚写的。。。）

前言

在原生 JavaScript 和 HTML 中，其实锚点跳转（Anchor / Hash 跳转）功能本身就存在，但存在一些问题，所以我们研发自定义的 Anchor 组件。

我们先来介绍一下原生的锚点跳转功能，在说明其局限性

一、什么是锚点跳转？

一句话概括： 点击一个链接，页面会自动滚动到指定位置。这个“指定位置”，就是锚点。

在浏览器里，锚点通常表现为 URL 里的 #xxx：
https://example.com/page#section1

#section1 就是锚点，浏览器会尝试找到页面中“叫这个名字”的位置，然后滚过去

最基础的用法，给目标位置一个 id：

<h2 id="section1">第一章</h2>
然后用 a 标签指向它:

<a href="#section1">跳到第一章</a>

然后当你点击链接时，浏览器会：

- 修改地址栏的 hash（#section1）
- 查找 id="section1" 的元素
- 自动滚动页面，让它出现在视口中
  不需要任何 JavaScript。

二、原生锚点的局限性

固定头部会遮挡内容

这个是非常常见的问题，假设你们的网站头部是固定的，那么当你点击锚点跳转时，目标位置会被头部遮挡。你们网站头部是一个 css 如下的固定样式：

header {
position: fixed;
top: 0;
height: 64px;
}
那么当你点击锚点跳转时，目标位置会被头部遮挡。例如：
<a href="#section1">跳到第一章</a>

浏览器的行为是：把 section1 的 顶部 对齐到视口顶部。结果就是：标题刚好被 header 挡住。

无法在容器内滚动

有时候我们滚动的对象不是 window 而是指定某个容器，必须要求锚点在这个容器内才行，但这个是很不友好的，因为锚点往往是页面最外面（fixed 或者 sticky）布局
然后点击跳转到指定容器内的元素。

没法做滚动监听

也就是我们滚动过程中，到底滚动到了哪个位置，然后响应的锚点元素高亮，代表当前滚动到了哪个位置。原生是不支持的

三、Anchor 组件的设计

我们的 Anchor 组件，会解决原生锚点的这些问题。这里简单描述一下解决思路：

头部遮挡内容问题

解决思路是，不要让浏览器决定滚到哪里，而是自己算。核心思路如下：

- 假设我们滚动的容器是 window，也就是浏览器窗口，首先你如何让一个 dom 元素滚动到浏览器的顶部呢？（不要用 scrollIntoView）
- 我们是不是需要计算当前浏览器滚动了多少距离，然后加上当前元素距离浏览器视口顶部的距离，就是这个元素需要滚动的距离，如下图
  暂时无法在飞书文档外展示此内容

已经滚动的距离是 window.pageYOffset 计算，dom 元素距离浏览器顶部的距离公式：getBoundingClientRect().top，然后 window 有个方法
window.scrollTo({
top: 100,
});
上面表示 window 的滚动距离变为 100px，那么把这个 100px 改为 window.pageYOffset + dom 元素的 getBoundingClientRect().top，是不是就是这个 dom 就跟浏览器顶部对齐了？

这个时候我们如果还想让滚动条少滚动点，给 dom 和浏览器顶部留一点空间，是不是可以让外部传入这个参数，用户决定留多少空间，是不是就能解决头部遮挡的问题了？例如传 -50，公式就变为 window.pageYOffset + dom 元素的 getBoundingClientRect().top - 50

- 还有一种情况是在用户指定的容器内部滚动，例如页面里面单独有个容器，这个容器有滚动条，你想让这个容器滚动到特定为止，让这个容器内的某个 dom 元素对齐这个容器顶部
  首先我们需要知道这个容器的滚动距离，然后加上这个 dom 元素，距离这个容器顶部的距离（思路跟上面容器是 window 一样，但是获取这些距离的 api 不一样了）。

- 容器滚动距离：element.scrollTop，element 代表具体的 dom 元素
- 容器中某个 dom 元素距离浏览器顶部的距离是 内部 dom 的 getBoundingClientRect().top，而这个容器距离浏览器顶部的距离是：容器的 getBoundingClientRect().top，如下图，相减就可以了，如下图

暂时无法在飞书文档外展示此内容

同理，容器只需要将自己的 scrollTop = 容器里的某个 dom 元素到浏览器顶部的距离 - 容器到浏览器顶部的距离，就能让容器里的某个 dom 元素对齐容器顶部。

当然如果外部传入了一个值，就可以不对齐顶部，而是留有空间。

在容器内滚动问题

上面也算提到了如何解决无法在容器内滚动的问题。这里就不赘述了。

滚动监听问题

我们会在滚动过程中，监听滚动事件，然后判断当前滚动到了哪个位置，然后响应的锚点元素高亮，代表当前滚动到了哪个位置。效果如下图：
[图片]

具体实现原理如下：

- 所有锚点元素，在初始化的时候，就被收集起来，锚点元素是什么，如下图：
  [图片]
  也就是一个一个可以点击跳转的元素。这些元素在我们组件库中使用方式如下：
  <Anchor.Link target-id="跳转内容的 id">锚点名字</Anchor.Link>

Anchor.Link 组件内部会收集 target-id，这个 id 一定要对应到页面上的某个元素。我们要使用 document.getElementById 来获取这个元素。从而收集到所有要定位到目标位置的元素。
从而为后面滚动到这个元素对应的位置做准备。

- 上面我们拿到了所有的在页面要定位的目标元素，那么滚动期间，我们就可以计算，当前所有元素中，哪个元素在当前视口中，并且离当前视口顶部最近。
  然后我们就可以把这个元素的 id 作为当前激活的锚点，也就是每当发现有新的锚点进入视口了（监听 scroll 事件），那么就用 react 的 setState，把最新的 id，也就是当前激活的 id 用 setState 更新，这个 id 在组件库内部命名为 currentId
  所以每个锚点只需要：
  className = {currentId === 自己的 target-id(每个 Anchor.Link 组件必须传入 target-id) ? activeClassName: className}
  就可以在激活的时候，显示自己传入的 activeClassName，也就是激活的 className，当没被激活的时候就显示普通状态的 className。

核心架子

这个小小的组件有很多技术细节，后面的小结部分有一些描述，这里浅谈一下组件库开发中一个常见的技术套路：订阅-发布模式。

之前我们说了 <Anchor.Link> 组件，它会收集所有要定位的目标元素。具体代码上是如何实现的呢？我们来说说细节：

首先，我们需要一个 AnchorContext 上下文，用来存储所有要定位的目标元素。使用方式如下：

'use client';
import { forwardRef, type PropsWithChildren } from 'react';
//... 省略各种 import 依赖

import type { AnchorProps } from './interface';

export const Anchor = forwardRef((props: PropsWithChildren<AnchorProps>, ref) => {
const {
// 参数省略
} = props;

// 通过声明 new Map() 来收集所有要定位的目标元素
const linkMap = useRef<Map<string, HTMLElement>>(new Map());

return (
<AnchorContext.Provider
value={
linkMap, // 这里是关键，意思是共享这个 linkMap 数据给下面的所有组件
// 其它传参省略
}} >
<div {...restProps} ref={useComposedRefs(wrapperRef, ref)}>
{children}
</div>
</AnchorContext.Provider>
);
});

以上代码中 linkMap 是一个 Map 数据结构，就是用来收集数据的。

如何收集呢？我们看 Anchor.Link 组件的实现：

'use client';

import { forwardRef, useContext, useEffect, useRef, type PropsWithChildren } from 'react';
import { AnchorContext } from './context';
// 省略其它参数

export const AnchorLink = forwardRef<HTMLDivElement, AnchorLinkProps>((props: PropsWithChildren<AnchorLinkProps>, ref) => {
// 获取上面 Provider 传下来的参数
const anchorContext = useContext(AnchorContext);
// ref
const linkRef = useRef<HTMLDivElement>(null);

// 这里是核心，收集所有要定位的目标元素
useEffect(() => {
addLink(linkMap, targetId, linkRef.current);
return () => {
removeLink(linkMap, targetId);
};
}, [targetId, linkMap]);

return (
<div
// 省略其它参数
data-target-id={targetId}
className={currentId === targetId ? activeClassName : className} >
{children}
</div>
);
});

注意上面的 useEffect, 其中 addLink 函数，实际上做的就是类似 linkMap.set(targetId, linkRef.current) 这样的操作(也就是 map 数据结构调用了 set 方法，把数据存入 map 数据结构里)。这样
linkMap 就收集到所有的锚点元素了。

这种套路，在 Checkbox 组件, ant design（或者说国内主流组件库） 的 Form 中都是这样来利用 发布-订阅模式，来控制组件之间的状态同步的或者收集所有子元素的。

最后一个点，也就是之前我们说了那么多，不是说我们自己设计的 Anchor 组件支持原生那样当用户输入 url，我们也能跳转到对应的 dom 吗？

首先我们之前说了如何跳转到对应 dom。这里有两个关键信息，一个是 url 如何设计？才能获取到对应的 dom id，另一个是如何跳转。如何跳转之前已经说了，现在关键是设计 url。

我们组件库采用的需要用户自己开启这个功能才行，传入参数 isCloseInitAnchor，才会开启（因为一般组件库都没有这个功能，其实也可以去掉这个参数，让其默认支持）。

我们设计的参数叫 targetId ，如果 url 是这样的 http://www.baidu.com?targetId=基础使用

我们在组件加载完毕，去 url 上找是否有 targetId 这个参数，找的方式也简单，直接通过 new URL(window.location.href)，解析当前的 url 即可。new URLSearchParams 可以解析 url 中的查询参数，我直接找
const url = new URL(window.location.href);
const params = new URLSearchParams(url.search);
const targetId = params.get(queryKey); // queryKey 默认是字符串 targetId，也支持用户自定义

如果有的话，就去找这个页面是否一个 targetId 对应的 id 的 dom 元素。最后我们之前说了如何定位到这个 dom，调用之前的方法，滚动到相应位置即可。
