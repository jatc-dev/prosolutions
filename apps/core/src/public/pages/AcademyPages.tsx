import { Link, useParams } from "react-router-dom";
import { AdSlot } from "@prosolutions/ui";
import { ARTICLES, AUTHORS, CATEGORIES, getArticle, relatedArticles, type Article } from "../../content/academy";
import { MarkdownContent } from "../../content/markdown";
import { PublicLayout, formatDate } from "../PublicLayout";
import { headForPath, useDocumentHead } from "../seo";
import { NotFoundPage } from "./InfoPages";

function ArticleCard({ article }: { article: Article }) {
  return (
    <article className="flex h-full flex-col rounded-ui-lg border border-ui-border bg-ui-surface p-5 shadow-card transition hover:border-ui-border-strong">
      <p className="text-xs font-semibold uppercase tracking-wide text-ui-accent">{CATEGORIES[article.category].label}</p>
      <h3 className="mt-2 text-lg font-semibold leading-snug text-ui-text">
        <Link to={`/academy/${article.slug}/`} className="hover:underline">
          {article.title}
        </Link>
      </h3>
      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-ui-muted">{article.description}</p>
      <p className="mt-4 text-xs text-ui-subtle">
        {article.readingMinutes} min de lectura · Actualizado el <time dateTime={article.updatedAt}>{formatDate(article.updatedAt)}</time>
      </p>
    </article>
  );
}

export function AcademyIndexPage() {
  useDocumentHead(headForPath("/academy"));
  const categories = Object.entries(CATEGORIES) as Array<[Article["category"], (typeof CATEGORIES)[Article["category"]]]>;

  return (
    <PublicLayout breadcrumbs={[{ name: "Academia", path: "/academy" }]}>
      <section className="mx-auto max-w-6xl px-4 pb-6 pt-8 sm:px-6">
        <p className="text-sm font-semibold text-ui-accent">ProAcademy</p>
        <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-ui-text sm:text-4xl">
          Guías prácticas para conseguir empleo y entender tus condiciones laborales
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-ui-muted">
          Artículos gratuitos sobre hojas de vida, entrevistas, salarios, contratos y cambios de carrera, escritos para personas de todos los sectores y actualizados cuando cambian las normas.
        </p>
      </section>

      {categories.map(([key, category]) => {
        const items = ARTICLES.filter((article) => article.category === key);
        if (items.length === 0) return null;
        return (
          <section key={key} aria-labelledby={`cat-${key}`} className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
            <h2 id={`cat-${key}`} className="text-xl font-semibold text-ui-text">{category.label}</h2>
            <p className="mt-1 text-sm text-ui-muted">{category.description}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((article) => (
                <ArticleCard key={article.slug} article={article} />
              ))}
            </div>
          </section>
        );
      })}

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <AdSlot placement="academy-index" format="leaderboard" />
      </div>
    </PublicLayout>
  );
}

export function ArticlePage() {
  const { slug = "" } = useParams();
  const article = getArticle(slug);
  const head = headForPath(`/academy/${slug}`);
  useDocumentHead(head);
  if (!article) return <NotFoundPage />;

  const author = AUTHORS[article.author]!;
  const related = relatedArticles(article);
  // One in-article unit after the 4th block of the body, far from navigation and buttons.
  const adAfter = 4;

  return (
    <PublicLayout
      breadcrumbs={[
        { name: "Academia", path: "/academy" },
        { name: article.title, path: `/academy/${article.slug}` },
      ]}
    >
      <article className="mx-auto max-w-3xl px-4 pb-10 pt-8 sm:px-6">
        <header>
          <p className="text-sm font-semibold text-ui-accent">{CATEGORIES[article.category].label}</p>
          <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-ui-text sm:text-4xl">{article.title}</h1>
          <p className="mt-4 text-lg leading-8 text-ui-muted">{article.description}</p>
          <p className="mt-5 flex flex-wrap gap-x-3 gap-y-1 text-sm text-ui-subtle">
            <span>
              Por <a href="#autor" className="font-medium text-ui-text hover:underline">{author.name}</a>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Publicado el <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
            </span>
            {article.updatedAt !== article.publishedAt && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  Actualizado el <time dateTime={article.updatedAt}>{formatDate(article.updatedAt)}</time>
                </span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span>{article.readingMinutes} min de lectura</span>
          </p>
        </header>

        <div className="mt-6">
          <MarkdownContent
            source={article.body}
            afterBlock={(index) => (index === adAfter ? <AdSlot placement="academy-article" format="in-article" className="my-8" /> : null)}
          />
        </div>

        <aside id="autor" aria-label="Autor" className="mt-12 rounded-ui-lg border border-ui-border bg-ui-soft p-5">
          <p className="text-sm font-semibold text-ui-text">{author.name}</p>
          <p className="text-xs text-ui-subtle">{author.role}</p>
          <p className="mt-2 text-sm leading-6 text-ui-muted">{author.bio}</p>
        </aside>
      </article>

      {related.length > 0 && (
        <section aria-labelledby="relacionados" className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
          <h2 id="relacionados" className="text-xl font-semibold text-ui-text">Artículos relacionados</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <ArticleCard key={item.slug} article={item} />
            ))}
          </div>
        </section>
      )}
    </PublicLayout>
  );
}
