// Theory: the articles of kb/theory.md by topic, a search that filters
// them as you type, and one article at a time. Links between articles are history steps, so Back walks
// back through the articles followed, then to the list.
import type { Article, Segment } from "../../lib/kb.ts";
import { TOPICS, articleById, findArticles } from "../../lib/kb.ts";
import { strings } from "../../lib/strings.ts";
import { Icon } from "./icons.tsx";
import { Crumb, Screen, ScreenTitle, SectionLabel } from "./parts.tsx";

const text = strings.app.theory;

export function TheoryList({ query, onQuery, onOpen, onBack }: { query: string; onQuery: (query: string) => void; onOpen: (id: string) => void; onBack: () => void }) {
  const found = findArticles(query);
  return (
    <Screen top={<Crumb backLabel={strings.app.back} onBack={onBack}>{strings.app.back}</Crumb>}>
      <ScreenTitle title={text.title} line={text.line} />
      <label className="flex min-h-12 items-center gap-2.5 rounded-2xl bg-card px-3.5 text-muted">
        <Icon name="search" size={20} className="flex-none" />
        <input
          type="search"
          value={query}
          placeholder={text.search}
          aria-label={text.searchLabel}
          onChange={(event) => onQuery(event.target.value)}
          className="min-h-11 min-w-0 flex-1 bg-transparent text-base text-ink outline-offset-4 placeholder:text-muted"
        />
      </label>
      {TOPICS.map((topic) => {
        const articles = found.filter((article) => article.topic === topic);
        if (articles.length === 0) return null;
        return (
          <section key={topic} aria-label={topic} className="flex flex-col gap-2">
            <SectionLabel>{topic}</SectionLabel>
            <div className="flex flex-col rounded-[var(--card-radius)] shadow-[var(--card-shadow)] bg-card px-3.5 py-0.5">
              {articles.map((article, index) => (
                <button
                  key={article.id}
                  type="button"
                  onClick={() => onOpen(article.id)}
                  className={`flex min-h-[58px] w-full cursor-pointer items-center gap-3 py-[7px] text-left ${index ? "border-t border-line" : ""}`}
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-semibold">{article.title}</span>
                    <span className="text-[13px] leading-[1.3] text-muted">{article.teaser}</span>
                  </span>
                  <Icon name="chevron" size={18} className="flex-none text-muted" />
                </button>
              ))}
            </div>
          </section>
        );
      })}
      {found.length === 0 && <p className="m-0 px-1 pt-2 text-[15px] text-muted">{text.noMatch}</p>}
      <span className="flex-[1_0_8px]" />
    </Screen>
  );
}

/** Text with dotted links to other articles. */
function Words({ parts, onOpen }: { parts: Segment[]; onOpen: (id: string) => void }) {
  return (
    <>
      {parts.map((part, index) =>
        part.link?.startsWith("#") ? (
          <button
            key={index}
            type="button"
            onClick={() => onOpen(part.link!.slice(1))}
            className="inline cursor-pointer border-b-2 border-dotted border-muted p-0 text-left leading-[inherit] font-medium"
          >
            {part.text}
          </button>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}

/** The picture: a scale in the film-strip colours, read like the result screen. One tile can be highlighted. */
function Picture({ article }: { article: Article }) {
  const { picture } = article;
  const long = picture.length > 5 || picture.some((tile) => tile.big.length > 4);
  return (
    <figure className="m-0 flex flex-col gap-2.5 rounded-[var(--card-radius)] bg-hero px-3 pt-3.5 pb-3 text-hero-ink max-[359px]:px-2">
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${picture.length}, minmax(0, 1fr))` }}>
        {picture.map((tile, index) => (
          <div
            key={index}
            className={`flex min-w-0 flex-col items-center gap-0.5 rounded-xl px-0.5 py-2 ${tile.on ? "bg-hero-ink text-hero" : "bg-[var(--hero-tile)]"}`}
          >
            <span className="text-[11px] font-semibold tracking-[0.04em] whitespace-nowrap opacity-65 max-[359px]:tracking-normal">{tile.top || " "}</span>
            <span className={`font-display leading-[1.05] font-semibold tracking-[-0.02em] whitespace-nowrap ${long ? "text-lg" : "text-2xl"}`}>{tile.big}</span>
            {tile.bottom && <span className="text-center text-[11px] leading-[1.25] opacity-65">{tile.bottom}</span>}
          </div>
        ))}
      </div>
      <figcaption className="px-1 text-[13px] leading-[1.4] opacity-75">{article.caption}</figcaption>
    </figure>
  );
}

export function ArticleScreen({ article, from, onOpen, onBack }: { article: Article; from: string | null; onOpen: (id: string) => void; onBack: () => void }) {
  const crumb = (from && articleById(from)?.title) || text.title;
  return (
    <Screen top={<Crumb backLabel={text.backTo(crumb)} onBack={onBack}>{crumb}</Crumb>}>
      <article className="flex flex-col gap-3.5 pb-2">
        <header className="flex flex-col gap-1.5 px-0.5 pt-2.5">
          <span className="type-label text-[13px] font-semibold text-muted">{article.topic}</span>
          <h1 className="m-0 font-display text-[30px] leading-[1.1] font-semibold tracking-[-0.02em]">{article.title}</h1>
          <p className="mt-1 mb-0 text-[19px] leading-[1.45] tracking-[-0.005em]">
            <Words parts={article.lead} onOpen={onOpen} />
          </p>
        </header>

        <Picture article={article} />

        {article.body.map((paragraph, index) => (
          <p key={index} className="m-0 px-0.5 text-base leading-[1.6]">
            <Words parts={paragraph} onOpen={onOpen} />
          </p>
        ))}

        <section aria-labelledby="practice-title" className="flex flex-col gap-1.5 rounded-[calc(var(--card-radius)-2px)] shadow-[var(--card-shadow)] bg-card px-4 pt-3 pb-3.5">
          <h2 id="practice-title" className="type-label m-0 text-[13px] font-semibold text-muted">
            {text.inPractice}
          </h2>
          {article.practice.map((row, index) => (
            <div key={row.what} className={`flex items-baseline justify-between gap-3 py-1 ${index ? "border-t border-line" : ""}`}>
              <span className="min-w-0 flex-1 text-[15px]">{row.what}</span>
              {/* Settings such as "f/5.6 at 1/250" never break across lines; only a long value wraps. */}
              <span
                className={`text-right font-display text-[17px] font-semibold tracking-[-0.01em] ${row.value.length <= 16 ? "flex-none whitespace-nowrap" : "max-w-[55%]"}`}
              >
                {row.value}
              </span>
            </div>
          ))}
        </section>

        <section aria-labelledby="next-title" className="flex flex-col gap-2">
          <h2 id="next-title" className="type-label m-0 px-1 pt-1 text-[13px] font-semibold text-muted">
            {text.readNext}
          </h2>
          <div className="flex flex-wrap gap-2">
            {article.readNext.map((id) => (
              <button key={id} type="button" onClick={() => onOpen(id)} className="min-h-11 cursor-pointer rounded-[20px] bg-card px-3.5 text-[15px] font-medium">
                {articleById(id)?.title}
              </button>
            ))}
          </div>
        </section>

        <section aria-labelledby="sources-title" className="flex flex-col gap-1 px-1 pt-2">
          <h2 id="sources-title" className="type-label m-0 text-[13px] font-semibold text-muted">
            {text.sources}
          </h2>
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13px] leading-[1.4] text-muted">
            {article.sources.map((source, index) => (
              <li key={index}>
                {source.map((part, at) =>
                  part.link ? (
                    <a key={at} href={part.link} target="_blank" rel="noreferrer" className="text-muted underline underline-offset-2">
                      {part.text}
                    </a>
                  ) : (
                    <span key={at}>{part.text}</span>
                  ),
                )}
              </li>
            ))}
          </ul>
        </section>
      </article>
    </Screen>
  );
}
