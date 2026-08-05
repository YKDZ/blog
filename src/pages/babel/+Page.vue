<script setup lang="ts">
import { watchDebounced } from "@vueuse/core";
import { useData } from "vike-vue/useData";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

import BlogArticleFooter from "@/components/BlogArticleFooter.vue";
import BlogArticleHeader from "@/components/BlogArticleHeader.vue";
import BlogListItem from "@/components/BlogListItem.vue";
import { fromBase62, toBase62 } from "@/lib/babel/base62";
import { createLibrary, type BookItem } from "@/lib/babel/library";
import { renderMarkdown } from "@/lib/markdownClient";
import { bookDescription, type PostCardItem } from "@/lib/post";
import { bookTitle } from "@/lib/title";

import BlogRenderer from "../blog/@slug/BlogRenderer.vue";
import { headingIdFromText } from "../blog/@slug/plugins/headingId";
import type { Data } from "./+data.server";

const data = useData<Data>();
const library = createLibrary(data.charset, {
  minLength: data.minLength,
  maxLength: data.maxLength,
});

const PAGE_SIZE = 20;

const articleMap = computed(
  () => new Map(data.articles.map((article) => [article.bookNumber, article])),
);

const formatDate = (time: number) => {
  const [year, month, day] = new Date(time)
    .toISOString()
    .slice(0, 10)
    .split("-");

  return `${year} 年 ${Number(month)} 月 ${Number(day)} 日`;
};

// 书架号的四个值
const hexagonInput = ref("0");
const wallInput = ref("0");
const shelfInput = ref("0");
const volumeInput = ref("0");

const adjusterError = ref<string>();
let activeVersion = 0;

const parseStartBookNumber = (): bigint => {
  const hexagon = hexagonInput.value.trim();

  return library.bookNumberFromLocation({
    hexagon,
    wall: Number(wallInput.value),
    shelfOnWall: Number(shelfInput.value),
    volume: Number(volumeInput.value),
  });
};

const startEnumeration = () => {
  const version = ++activeVersion;
  adjusterError.value = undefined;
  browseError.value = undefined;
  mode.value = "browse";
  queryIterator = undefined;

  try {
    const start = parseStartBookNumber();
    books.value = [];
    exhausted.value = false;
    void loadPage(start, false, version);
  } catch (error) {
    if (version === activeVersion) {
      adjusterError.value =
        error instanceof Error ? error.message : String(error);
      loading.value = false;
      loadingMore.value = false;
    }
  }
};

const mode = ref<"browse" | "query">("browse");
const books = ref<BookItem[]>([]);
const loading = ref(false);
const loadingMore = ref(false);
const exhausted = ref(false);
const browseError = ref<string>();
const queryInput = ref("");
let queryIterator: Generator<BookItem> | undefined;

const loadPage = async (from: bigint, append: boolean, version: number) => {
  const busy = append ? loadingMore : loading;
  busy.value = true;
  browseError.value = undefined;

  try {
    if (!append) {
      // 先让浏览器完成首帧绘制，书架列表再异步加载。
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const collected: BookItem[] = [];
    const iterator = library.booksFrom(from);

    for (let i = 0; i < PAGE_SIZE; i++) {
      const { value, done } = iterator.next();

      if (done) {
        exhausted.value = true;
        break;
      }

      collected.push(value);

      if (collected.length % 5 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));

        if (version !== activeVersion) return;
      }
    }

    if (version !== activeVersion) return;

    if (collected.length < PAGE_SIZE) exhausted.value = true;

    if (append) books.value.push(...collected);
    else books.value = collected;
  } catch (error) {
    if (version === activeVersion) {
      browseError.value =
        error instanceof Error ? error.message : String(error);
    }
  } finally {
    if (version === activeVersion) busy.value = false;
  }
};

const loadQueryPage = async (append: boolean, version: number) => {
  if (!queryIterator) return;

  const busy = append ? loadingMore : loading;
  busy.value = true;
  browseError.value = undefined;

  try {
    const collected: BookItem[] = [];

    for (let i = 0; i < PAGE_SIZE; i++) {
      const { value, done } = queryIterator.next();

      if (done) {
        exhausted.value = true;
        break;
      }

      collected.push(value);

      if (collected.length % 5 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));

        if (version !== activeVersion) return;
      }
    }

    if (version !== activeVersion) return;

    if (collected.length < PAGE_SIZE) exhausted.value = true;

    if (append) books.value.push(...collected);
    else books.value = collected;
  } catch (error) {
    if (version === activeVersion) {
      browseError.value =
        error instanceof Error ? error.message : String(error);
    }
  } finally {
    if (version === activeVersion) busy.value = false;
  }
};

const runQuery = () => {
  const version = ++activeVersion;
  const pattern = queryInput.value;
  adjusterError.value = undefined;
  browseError.value = undefined;

  if (pattern.length === 0) {
    browseError.value = "请输入要查询的子串";
    return;
  }

  mode.value = "query";
  books.value = [];
  exhausted.value = false;

  try {
    const patternLength = Array.from(pattern).length;

    if (patternLength > data.maxLength) {
      throw new RangeError(
        `子串长度 ${patternLength} 超过图书馆最大长度 ${data.maxLength}`,
      );
    }

    const startLength = Math.max(patternLength, data.minLength);
    const windowSize = Math.min(data.maxLength, startLength + 20);

    queryIterator = library.booksContaining(pattern, {
      maxLength: windowSize,
    });
    void loadQueryPage(false, version);
  } catch (error) {
    if (version === activeVersion) {
      browseError.value =
        error instanceof Error ? error.message : String(error);
      loading.value = false;
      loadingMore.value = false;
    }
  }
};

const loadMore = () => {
  if (loadingMore.value) return;

  if (mode.value === "query") {
    if (!queryIterator) return;

    void loadQueryPage(true, activeVersion);
    return;
  }

  const last = books.value.at(-1);

  if (!last) return;

  void loadPage(last.bookNumber + 1n, true, activeVersion);
};

watchDebounced(
  [hexagonInput, wallInput, shelfInput, volumeInput, queryInput],
  (
    [hexagon, wall, shelf, volume, query],
    [oldHexagon, oldWall, oldShelf, oldVolume, oldQuery],
  ) => {
    const locationChanged =
      hexagon !== oldHexagon ||
      wall !== oldWall ||
      shelf !== oldShelf ||
      volume !== oldVolume;
    const queryChanged = query !== oldQuery;

    if (query.trim().length > 0) {
      if (queryChanged) runQuery();
    } else if (queryChanged || locationChanged) {
      startEnumeration();
    }
  },
  { debounce: 250, maxWait: 1000 },
);

const cardItem = (book: BookItem): PostCardItem => {
  const article = articleMap.value.get(book.bookNumber.toString());

  return {
    title: article?.title ?? (bookTitle(book.text) || "（空白）"),
    href: "#babel",
    description: article?.description ?? bookDescription(book.text),
    time: article ? formatDate(article.time) : `? 年 ? 月 ? 日`,
  };
};

const onCardClick = (event: MouseEvent, book: BookItem) => {
  event.preventDefault();
  openBook(book);
};

// 阅读界面
const view = ref<"browse" | "read">("browse");
const currentBook = ref<BookItem>();
const rawMarkdownHref = ref<string>();
const readerHtml = ref("");
const readerRendering = ref(false);
const readerError = ref<string>();
let previousRawUrl: string | undefined;

const currentBookTitle = computed(() => {
  const title = bookTitle(currentBook.value?.text ?? "");

  return title || "（空书）";
});

const currentTitleId = computed(() =>
  headingIdFromText(currentBookTitle.value),
);

const currentBookMeta = computed(() => {
  return currentBook.value ? "? 年 ? 月 ? 日" : "";
});

const currentBookLocation = computed(() => {
  // 阅读界面打开前不会渲染 footer；这里只是给类型一个安全回退。
  if (!currentBook.value) {
    return { hexagon: "0", wall: 0, shelfOnWall: 0, volume: 0 };
  }

  const location = library.bookLocation(currentBook.value.bookNumber);

  return {
    hexagon: toBase62(location.hexagon),
    wall: location.wall,
    shelfOnWall: location.shelfOnWall,
    volume: location.volume,
  };
});

const currentModifiedAt = computed(() =>
  currentBook.value ? "修改于 ? 月 ? 日" : undefined,
);

const showBook = async (book: BookItem) => {
  if (
    currentBook.value?.bookNumber === book.bookNumber &&
    view.value === "read"
  ) {
    return;
  }

  currentBook.value = book;
  view.value = "read";
  readerHtml.value = "";
  readerError.value = undefined;
  readerRendering.value = true;

  if (previousRawUrl) URL.revokeObjectURL(previousRawUrl);

  previousRawUrl = URL.createObjectURL(
    new Blob([book.text], { type: "text/markdown;charset=utf-8" }),
  );
  rawMarkdownHref.value = previousRawUrl;

  try {
    readerHtml.value = await renderMarkdown(book.text, {
      removeFirstHeading: true,
    });
  } catch (error) {
    readerError.value = error instanceof Error ? error.message : String(error);
  } finally {
    readerRendering.value = false;
  }
};

const openBook = (book: BookItem) => {
  const code = toBase62(book.bookNumber);
  const target = `#/book/${code}`;

  if (window.location.hash === target) {
    void showBook(book);
  } else {
    window.location.hash = `/book/${code}`;
  }
};

const navigateFromHash = () => {
  const match = /^#\/book\/([0-9A-Za-z]+)$/.exec(window.location.hash);

  if (match) {
    try {
      const bookNumber = fromBase62(match[1]!);
      const text = library.bookNumberToText(bookNumber);

      void showBook({ bookNumber, text });
    } catch {
      view.value = "browse";
      startEnumeration();
    }

    return;
  }

  view.value = "browse";
  startEnumeration();
};

onMounted(() => {
  window.addEventListener("hashchange", navigateFromHash);
  navigateFromHash();
});

onBeforeUnmount(() => {
  window.removeEventListener("hashchange", navigateFromHash);
});
</script>

<template>
  <section v-if="view === 'browse'" class="space-y-8">
    <header class="space-y-3">
      <h1 class="text-3xl leading-snug font-semibold tracking-normal">
        <a
          href="https://libraryofbabel.info/"
          hreflang="en"
          rel="noopener noreferrer"
          target="_blank"
          aria-label="前往原版巴别图书馆（libraryofbabel.info）"
        >
          图书馆
        </a>
      </h1>
      <p class="text-xs leading-6 text-(--page-fg-muted)">你想前往哪里？</p>
    </header>

    <article
      class="border border-(--page-border-soft) bg-(--page-surface) px-5 py-4 sm:px-6"
    >
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label class="space-y-1 text-xs text-(--page-fg-muted)">
          <span>房间（base62）</span>
          <input
            v-model="hexagonInput"
            type="text"
            class="w-full border border-(--page-border-soft) bg-(--page-bg) px-3 py-2 font-mono text-sm text-(--page-fg) outline-none focus:border-(--page-border)"
          />
        </label>
        <label class="space-y-1 text-xs text-(--page-fg-muted)">
          <span>墙（0–3）</span>
          <input
            v-model="wallInput"
            type="number"
            min="0"
            max="3"
            class="w-full border border-(--page-border-soft) bg-(--page-bg) px-3 py-2 font-mono text-sm text-(--page-fg) outline-none focus:border-(--page-border)"
          />
        </label>
        <label class="space-y-1 text-xs text-(--page-fg-muted)">
          <span>层（0–4）</span>
          <input
            v-model="shelfInput"
            type="number"
            min="0"
            max="4"
            class="w-full border border-(--page-border-soft) bg-(--page-bg) px-3 py-2 font-mono text-sm text-(--page-fg) outline-none focus:border-(--page-border)"
          />
        </label>
        <label class="space-y-1 text-xs text-(--page-fg-muted)">
          <span>卷（0–31）</span>
          <input
            v-model="volumeInput"
            type="number"
            min="0"
            max="31"
            class="w-full border border-(--page-border-soft) bg-(--page-bg) px-3 py-2 font-mono text-sm text-(--page-fg) outline-none focus:border-(--page-border)"
          />
        </label>
      </div>
      <div
        class="my-4 flex items-center gap-3 text-xs text-(--page-fg-muted)"
        aria-hidden="true"
      >
        <span class="h-px flex-1 bg-(--page-border-soft)"></span>
        <span>或</span>
        <span class="h-px flex-1 bg-(--page-border-soft)"></span>
      </div>
      <label class="block space-y-1 text-xs text-(--page-fg-muted)">
        <input
          v-model="queryInput"
          type="text"
          class="w-full border border-(--page-border-soft) bg-(--page-bg) px-3 py-2 font-mono text-sm text-(--page-fg) outline-none focus:border-(--page-border)"
          placeholder="输入要查询的书籍内容"
        />
      </label>
      <div class="mt-4 flex items-center gap-3">
        <button
          type="button"
          class="border border-(--page-border-soft) bg-(--page-bg) px-4 py-2 text-sm transition-colors hover:border-(--page-border-hover) disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="queryInput.trim().length > 0"
          @click="startEnumeration"
        >
          去这里
        </button>
        <p v-if="adjusterError" class="text-xs text-red-600">
          {{ adjusterError }}
        </p>
      </div>
    </article>

    <article class="space-y-4">
      <h2 class="text-lg font-semibold">
        {{ mode === "query" ? `包含 “${queryInput}” 的书` : "书架上的书" }}
      </h2>
      <p v-if="loading" class="text-sm text-(--page-fg-muted)">探索中...</p>
      <template v-else>
        <div class="space-y-4">
          <BlogListItem
            v-for="book in books"
            :key="book.bookNumber.toString()"
            :item="cardItem(book)"
            @click="onCardClick($event, book)"
          />
        </div>
        <p v-if="browseError" class="text-xs text-red-600">
          {{ browseError }}
        </p>
        <div class="flex justify-center pt-2">
          <button
            v-if="!exhausted"
            type="button"
            class="border border-(--page-border-soft) bg-(--page-bg) px-4 py-2 text-sm transition-colors hover:border-(--page-border-hover)"
            :disabled="loadingMore"
            @click="loadMore"
          >
            {{ loadingMore ? "探索中..." : `探索更多` }}
          </button>
          <p v-else class="text-xs text-(--page-fg-muted)">
            已到尽头，共找到了 {{ books.length }} 本书
          </p>
        </div>
      </template>
    </article>
  </section>

  <section v-else class="space-y-6">
    <article class="md:pb-[50vh]">
      <BlogArticleHeader
        :title="currentBookTitle"
        :title-id="currentTitleId"
        :time-label="currentBookMeta"
      />
      <p v-if="readerRendering" class="text-sm text-(--page-fg-muted)">
        渲染中...
      </p>
      <p v-else-if="readerError" class="text-xs text-red-600">
        {{ readerError }}
      </p>
      <BlogRenderer
        v-else
        :current-slug="'babel'"
        :current-title="currentBookTitle"
        :html="readerHtml"
      />
      <BlogArticleFooter
        v-if="currentBook"
        :aria-title="currentBookTitle"
        :babel-location="currentBookLocation"
        :markdown-href="rawMarkdownHref ?? ''"
        :modified-at="currentModifiedAt"
        markdown-target="_blank"
      />
    </article>
  </section>
</template>
