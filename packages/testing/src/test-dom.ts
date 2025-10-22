/*
 * A very small DOM implementation tailored for Vitest in environments where jsdom
 * is unavailable. It intentionally implements only the pieces that our tests rely
 * on (element creation, tree traversal, events, and storage).
 */

type Listener = (event: MiniEvent) => void;

type ListenerMap = Map<string, Set<Listener>>;

const addListener = (map: ListenerMap, type: string, listener: Listener) => {
  let set = map.get(type);
  if (!set) {
    set = new Set();
    map.set(type, set);
  }
  set.add(listener);
};

const removeListener = (map: ListenerMap, type: string, listener: Listener) => {
  map.get(type)?.delete(listener);
};

class MiniEvent {
  defaultPrevented = false;
  propagationStopped = false;
  currentTarget: MiniNode | null = null;
  target: MiniNode | null = null;
  readonly bubbles: boolean;
  readonly cancelable: boolean;
  readonly composed: boolean;
  readonly timeStamp: number;
  private readonly path: MiniNode[] = [];

  constructor(public readonly type: string, options: EventInit = {}) {
    this.bubbles = options.bubbles ?? false;
    this.cancelable = options.cancelable ?? false;
    this.composed = (options as { composed?: boolean }).composed ?? false;
    this.timeStamp = Date.now();
  }

  preventDefault() {
    if (this.cancelable) {
      this.defaultPrevented = true;
    }
  }

  stopPropagation() {
    this.propagationStopped = true;
  }

  composedPath(): MiniNode[] {
    return [...this.path];
  }

  _pushToPath(node: MiniNode) {
    if (!this.path.includes(node)) {
      this.path.push(node);
    }
  }
}

class MiniNode {
  static readonly ELEMENT_NODE = 1;
  static readonly TEXT_NODE = 3;
  static readonly DOCUMENT_NODE = 9;
  static readonly DOCUMENT_FRAGMENT_NODE = 11;

  public readonly childNodes: MiniNode[] = [];
  public parentNode: MiniNode | null = null;
  public ownerDocument: MiniDocument;

  constructor(ownerDocument: MiniDocument) {
    this.ownerDocument = ownerDocument;
  }

  get firstChild(): MiniNode | null {
    return this.childNodes[0] ?? null;
  }

  get lastChild(): MiniNode | null {
    return this.childNodes[this.childNodes.length - 1] ?? null;
  }

  get previousSibling(): MiniNode | null {
    if (!this.parentNode) {
      return null;
    }

    const index = this.parentNode.childNodes.indexOf(this);
    if (index <= 0) {
      return null;
    }

    return this.parentNode.childNodes[index - 1] ?? null;
  }

  get nextSibling(): MiniNode | null {
    if (!this.parentNode) {
      return null;
    }

    const index = this.parentNode.childNodes.indexOf(this);
    if (index < 0 || index >= this.parentNode.childNodes.length - 1) {
      return null;
    }

    return this.parentNode.childNodes[index + 1] ?? null;
  }

  appendChild<T extends MiniNode>(node: T): T {
    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }

    this.childNodes.push(node);
    node.parentNode = this;
    return node;
  }

  insertBefore<T extends MiniNode>(node: T, reference: MiniNode | null): T {
    if (!reference) {
      return this.appendChild(node);
    }

    const index = this.childNodes.indexOf(reference);
    if (index === -1) {
      throw new Error('Reference node is not a child of this node');
    }

    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }

    this.childNodes.splice(index, 0, node);
    node.parentNode = this;
    return node;
  }

  removeChild<T extends MiniNode>(node: T): T {
    const index = this.childNodes.indexOf(node);
    if (index === -1) {
      throw new Error('Node to remove is not a child of this node');
    }

    this.childNodes.splice(index, 1);
    node.parentNode = null;
    return node;
  }

  replaceChild<T extends MiniNode>(node: MiniNode, reference: T): T {
    this.insertBefore(node, reference);
    this.removeChild(reference);
    return reference;
  }

  contains(node: MiniNode | null): boolean {
    if (!node) {
      return false;
    }

    if (node === this) {
      return true;
    }

    return this.childNodes.some((child) => child.contains(node));
  }

  cloneNode(deep = false): MiniNode {
    const clone = new MiniNode(this.ownerDocument);
    if (deep) {
      for (const child of this.childNodes) {
        clone.appendChild(child.cloneNode(true));
      }
    }

    return clone;
  }

  get textContent(): string {
    return this.childNodes.map((child) => child.textContent).join('');
  }

  set textContent(value: string) {
    this.childNodes.splice(0, this.childNodes.length);
    if (value) {
      this.appendChild(new MiniText(this.ownerDocument, value));
    }
  }

  get nodeType(): number {
    return 0;
  }

  protected getListeners(): ListenerMap | undefined {
    return undefined;
  }

  dispatchEvent(event: MiniEvent): boolean {
    event.target = this;
    let current: MiniNode | null = this;

    while (current) {
      event._pushToPath(current);
      const listeners = current.getListeners?.();
      if (listeners) {
        const handlers = listeners.get(event.type);
        if (handlers) {
          for (const handler of handlers) {
            if (event.propagationStopped) {
              break;
            }

            event.currentTarget = current;
            handler(event);
          }
        }
      }

      if (!event.bubbles) {
        break;
      }

      current = current.parentNode;
    }

    if (event.bubbles && this.ownerDocument) {
      this.ownerDocument.dispatchToWindow(event);
    }

    return !event.defaultPrevented;
  }
}

class MiniText extends MiniNode {
  constructor(ownerDocument: MiniDocument, public data: string) {
    super(ownerDocument);
  }

  override get textContent(): string {
    return this.data;
  }

  override set textContent(value: string) {
    this.data = value;
  }

  override get nodeType(): number {
    return 3;
  }
}

class MiniClassList {
  private readonly classes = new Set<string>();

  constructor(initial?: string) {
    if (initial) {
      for (const part of initial.split(/\s+/).filter(Boolean)) {
        this.classes.add(part);
      }
    }
  }

  add(...tokens: string[]) {
    tokens.forEach((token) => this.classes.add(token));
  }

  remove(...tokens: string[]) {
    tokens.forEach((token) => this.classes.delete(token));
  }

  contains(token: string): boolean {
    return this.classes.has(token);
  }

  toggle(token: string, force?: boolean): boolean {
    if (force === true) {
      this.classes.add(token);
      return true;
    }

    if (force === false) {
      this.classes.delete(token);
      return false;
    }

    if (this.classes.has(token)) {
      this.classes.delete(token);
      return false;
    }

    this.classes.add(token);
    return true;
  }

  toString(): string {
    return Array.from(this.classes).join(' ');
  }
}

class MiniElement extends MiniNode {
  public readonly attributes = new Map<string, string>();
  public readonly style: Record<string, string> = {};
  public readonly listeners: ListenerMap = new Map();
  public readonly classList: MiniClassList;
  public value: string | null = null;
  public checked = false;
  public disabled = false;
  public dataset: Record<string, string> = {};
  public readonly namespaceURI = 'http://www.w3.org/1999/xhtml';

  constructor(ownerDocument: MiniDocument, public readonly tagName: string) {
    super(ownerDocument);
    this.classList = new MiniClassList();
  }

  get nodeName(): string {
    return this.tagName;
  }

  override get nodeType(): number {
    return 1;
  }

  get id(): string {
    return this.getAttribute('id') ?? '';
  }

  set id(value: string) {
    this.setAttribute('id', value);
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, String(value));

    if (name === 'class' || name === 'className') {
      this.classList.add(...String(value).split(/\s+/).filter(Boolean));
    }

    if (name === 'value') {
      this.value = String(value);
    }

    if (name.startsWith('data-')) {
      const key = name
        .slice(5)
        .split('-')
        .map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
        .join('');
      this.dataset[key] = String(value);
    }
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name: string) {
    this.attributes.delete(name);
    if (name === 'value') {
      this.value = null;
    }
  }

  addEventListener(type: string, listener: Listener) {
    addListener(this.listeners, type, listener);
  }

  removeEventListener(type: string, listener: Listener) {
    removeListener(this.listeners, type, listener);
  }

  protected override getListeners(): ListenerMap | undefined {
    return this.listeners;
  }

  focus() {
    this.ownerDocument.activeElement = this;
  }

  blur() {
    if (this.ownerDocument.activeElement === this) {
      this.ownerDocument.activeElement = null;
    }
  }

  get innerHTML(): string {
    return this.childNodes.map((child) => child.textContent).join('');
  }

  set innerHTML(value: string) {
    this.childNodes.splice(0, this.childNodes.length);
    if (value) {
      this.appendChild(new MiniText(this.ownerDocument, value));
    }
  }

  override get textContent(): string {
    return super.textContent;
  }

  override set textContent(value: string) {
    super.textContent = value;
  }

  matches(selector: string): boolean {
    return matchesSelector(this, selector);
  }

  querySelector(selector: string): MiniElement | null {
    return querySelectorAll(this, selector)[0] ?? null;
  }

  querySelectorAll(selector: string): MiniElement[] {
    return querySelectorAll(this, selector);
  }

  getBoundingClientRect() {
    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      toJSON() {
        return this;
      }
    };
  }
}

class MiniDocument extends MiniNode {
  public readonly documentElement: MiniElement;
  public readonly body: MiniElement;
  public defaultView!: MiniWindow;
  public activeElement: MiniElement | null = null;
  public readonly nodeName = '#document';
  public readonly listeners: ListenerMap = new Map();
  public readyState: DocumentReadyState = 'complete';

  constructor() {
    super(null as unknown as MiniDocument);
    this.ownerDocument = this;
    this.documentElement = new MiniElement(this, 'html');
    this.body = new MiniElement(this, 'body');
    this.documentElement.appendChild(this.body);
  }

  override get nodeType(): number {
    return 9;
  }

  createElement(tagName: string): MiniElement {
    return new MiniElement(this, tagName.toUpperCase());
  }

  createElementNS(_: string | null, tagName: string): MiniElement {
    return this.createElement(tagName);
  }

  createTextNode(data: string): MiniText {
    return new MiniText(this, data);
  }

  createComment(data: string): MiniText {
    return new MiniText(this, data);
  }

  createDocumentFragment(): MiniDocumentFragment {
    return new MiniDocumentFragment(this);
  }

  getElementById(id: string): MiniElement | null {
    return querySelectorAll(this, `#${id}`)[0] ?? null;
  }

  querySelector(selector: string): MiniElement | null {
    return this.documentElement.querySelector(selector);
  }

  querySelectorAll(selector: string): MiniElement[] {
    return this.documentElement.querySelectorAll(selector);
  }

  createRange() {
    return {
      setStart: () => {},
      setEnd: () => {},
      getBoundingClientRect: () => ({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }),
      getClientRects: () => ([] as unknown[]),
    };
  }

  addEventListener(type: string, listener: Listener) {
    addListener(this.listeners, type, listener);
  }

  removeEventListener(type: string, listener: Listener) {
    removeListener(this.listeners, type, listener);
  }

  protected override getListeners(): ListenerMap | undefined {
    return this.listeners;
  }

  dispatchToWindow(event: MiniEvent) {
    if (this.defaultView instanceof MiniWindow) {
      this.defaultView.dispatchEventFromDocument(event);
    }
  }
}

class MiniDocumentFragment extends MiniNode {
  constructor(ownerDocument: MiniDocument) {
    super(ownerDocument);
  }

  override get nodeType(): number {
    return 11;
  }
}

class MiniStorage {
  private readonly store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

class MiniWindow {
  public readonly document: MiniDocument;
  public readonly localStorage = new MiniStorage();
  public readonly sessionStorage = new MiniStorage();
  public readonly navigator = { userAgent: 'MiniDOM', language: 'en-US' };
  public readonly location = { href: 'http://localhost/' };
  private readonly listeners: ListenerMap = new Map();

  constructor(document: MiniDocument) {
    this.document = document;
    document.defaultView = this;
  }

  getComputedStyle(_: MiniElement) {
    return {
      getPropertyValue: () => '',
    };
  }

  requestAnimationFrame(callback: FrameRequestCallback): number {
    return setTimeout(() => callback(Date.now()), 0) as unknown as number;
  }

  cancelAnimationFrame(id: number) {
    clearTimeout(id);
  }

  addEventListener(type: string, listener: Listener) {
    addListener(this.listeners, type, listener);
  }

  removeEventListener(type: string, listener: Listener) {
    removeListener(this.listeners, type, listener);
  }

  dispatchEvent(event: MiniEvent): boolean {
    event.target = (event.target as MiniNode) ?? (this.document as unknown as MiniNode);
    event._pushToPath(this.document);
    const handlers = this.listeners.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        event.currentTarget = this.document;
        handler(event);
      }
    }
    return !event.defaultPrevented;
  }

  dispatchEventFromDocument(event: MiniEvent) {
    const handlers = this.listeners.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        event.currentTarget = this as unknown as MiniNode;
        handler(event);
      }
    }
  }
}

const selectorSplitter = /\s*,\s*/;
const attrSelector = /^(?<tag>[a-zA-Z\*][a-zA-Z0-9\-*]*)?(?<attr>\[[^\]]+\])?(?<id>#[^\.\[]+)?(?<class>\.[^\[]+)?$/;

function matchesSelector(element: MiniElement, selector: string): boolean {
  if (!selector) {
    return false;
  }

  const trimmed = selector.trim();
  if (trimmed === '*') {
    return true;
  }

  const match = attrSelector.exec(trimmed);
  if (!match || !match.groups) {
    return false;
  }

  const { tag, attr, id, class: classSelector } = match.groups;

  if (tag && tag !== '*' && element.tagName.toLowerCase() !== tag.toLowerCase()) {
    return false;
  }

  if (id) {
    const expected = id.slice(1);
    if (element.id !== expected) {
      return false;
    }
  }

  if (classSelector) {
    const classes = classSelector
      .split('.')
      .filter(Boolean);
    for (const token of classes) {
      if (!element.classList.contains(token)) {
        return false;
      }
    }
  }

  if (attr) {
    const attribute = attr.slice(1, -1).trim();
    const [rawName, rawValue] = attribute.split('=');
    const name = rawName.trim();
    if (!rawValue) {
      if (element.getAttribute(name) === null) {
        return false;
      }
    } else {
      const expected = rawValue.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
      if (element.getAttribute(name) !== expected) {
        return false;
      }
    }
  }

  return true;
}

function querySelectorAll(root: MiniNode, selector: string): MiniElement[] {
  const selectors = selector.split(selectorSplitter).map((part) => part.trim()).filter(Boolean);
  const results: MiniElement[] = [];

  const visit = (node: MiniNode) => {
    if (node instanceof MiniElement) {
      for (const single of selectors) {
        if (matchesSelector(node, single)) {
          results.push(node);
          break;
        }
      }
    }

    for (const child of node.childNodes) {
      visit(child);
    }
  };

  visit(root);
  return results;
}

export const installMiniDom = () => {
  if (typeof globalThis.document !== 'undefined') {
    return;
  }

  const document = new MiniDocument();
  const window = new MiniWindow(document);

  globalThis.window = window as unknown as Window & typeof globalThis;
  globalThis.document = document as unknown as Document;
  globalThis.Document = MiniDocument as unknown as typeof Document;
  globalThis.HTMLElement = MiniElement as unknown as typeof HTMLElement;
  globalThis.Node = MiniNode as unknown as typeof Node;
  globalThis.Text = MiniText as unknown as typeof Text;
  globalThis.DocumentFragment = MiniDocumentFragment as unknown as typeof DocumentFragment;
  globalThis.Event = MiniEvent as unknown as typeof Event;
  globalThis.CustomEvent = MiniEvent as unknown as typeof CustomEvent;
  globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window) as typeof cancelAnimationFrame;
  globalThis.getComputedStyle = window.getComputedStyle.bind(window) as unknown as typeof getComputedStyle;
  globalThis.localStorage = window.localStorage as unknown as Storage;
  globalThis.sessionStorage = window.sessionStorage as unknown as Storage;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    enumerable: true,
    writable: true,
    value: window.navigator as Navigator,
  });
  globalThis.performance = globalThis.performance ?? {
    now: () => Date.now(),
  };
};
