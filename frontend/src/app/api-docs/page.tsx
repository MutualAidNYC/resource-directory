import { Metadata } from "next";
import { apiDocs, type Endpoint, type Field } from "@/lib/openapi";

export const metadata: Metadata = {
    title: "API",
    description: "The directory's resources and groups as a read-only API in the Open Referral HSDS format.",
};

// The offset keeps underscores in linked names (`service_list`) visible.
const LINK = "hover:text-[var(--primary-hover)] underline underline-offset-4 hover:no-underline";
const CODE = "text-sm bg-[var(--section-alt)] rounded px-1";

/**
 * API docs, built from the OpenAPI description (`lib/openapi.ts`). Not at
 * `/api/docs`: everything under `/api` is the API's (see worker/scripts/assemble.mjs).
 * Plain links, not next/link: the API's URLs aren't site pages.
 */
export default function ApiDocsPage() {
    const docs = apiDocs();

    return (
        <div className="mx-auto max-w-3xl px-4 py-8 space-y-10">
            <div className="space-y-4">
                <h1 className="text-3xl">{docs.title}</h1>
                <p>
                    The resources and groups in this directory, as a read-only API in the{" "}
                    <a href="https://docs.openreferral.org/" className={LINK}>
                        Open Referral Human Services Data Specification (HSDS)
                    </a>{" "}
                    format. No key or account needed.
                </p>
                <p>
                    In the API, a resource is a <code className={CODE}>service</code> and a group is
                    an <code className={CODE}>organization</code>, as HSDS names them.
                </p>
                <ul className="list-disc pl-6 space-y-1">
                    <li>
                        Every record in one file: <a href="/api/download.json" className={LINK}>/api/download.json</a>
                    </li>
                    <li>
                        The OpenAPI description: <a href="/api/openapi.json" className={LINK}>/api/openapi.json</a>
                    </li>
                </ul>
            </div>

            <nav aria-label="On this page" className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
                <h2 className="text-xl mb-4">On this page</h2>
                <ul className="list-disc pl-6 space-y-1">
                    <li><a href="#pages" className={LINK}>Lists and pages</a></li>
                    <li><a href="#errors" className={LINK}>Errors</a></li>
                    <li>
                        <a href="#endpoints" className={LINK}>Endpoints</a>
                        <ul className="list-disc pl-6 mt-1 space-y-1">
                            {docs.endpoints.map((e) => (
                                <li key={e.anchor}>
                                    <a href={`#${e.anchor}`} className={`${LINK} font-mono text-sm wrap-anywhere`}>
                                        {e.path}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </li>
                </ul>
            </nav>

            <section className="space-y-4">
                <h2 id="pages" className="text-xl">Lists and pages</h2>
                <p>
                    Lists return one page of records at a time, in <code className={CODE}>contents</code>.
                    Use <code className={CODE}>page</code> and <code className={CODE}>per_page</code> to
                    get the rest. Each page also has:
                </p>
                <Fields fields={docs.pageFields} />
            </section>

            <section className="space-y-4">
                <h2 id="errors" className="text-xl">Errors</h2>
                <p>
                    Errors are JSON with a message: <code className={CODE}>{'{"error": "…"}'}</code>
                </p>
                <ul className="list-disc pl-6 space-y-1">
                    <li>
                        <span className="font-bold">400</span>: an HSDS parameter this API doesn&apos;t support, a bad value,
                        or the same parameter twice. Parameters HSDS doesn&apos;t define are ignored.
                    </li>
                    <li><span className="font-bold">404</span>: no record or endpoint at that path.</li>
                    <li><span className="font-bold">405</span>: a method other than GET or HEAD.</li>
                </ul>
                <p>
                    A filter with an id that matches nothing, such as{" "}
                    <code className={CODE}>organization_id</code>, returns an empty page, not an error.
                </p>
            </section>

            <section className="space-y-6">
                <h2 id="endpoints" className="text-xl">Endpoints</h2>
                {docs.endpoints.map((e) => (
                    <EndpointSection key={e.anchor} endpoint={e} />
                ))}
            </section>

            {/* Required by the license of static_build/openapi.json, which this page adapts. */}
            <p className="text-sm text-[var(--muted)]">
                Adapted from Open Referral&apos;s HSDS OpenAPI description, © Open Referral,{" "}
                <a href="https://creativecommons.org/licenses/by-sa/4.0/" className={LINK}>CC BY-SA 4.0</a>.
                This page is shared under the same license.
            </p>
        </div>
    );
}

function EndpointSection({ endpoint: e }: { endpoint: Endpoint }) {
    return (
        <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 space-y-4">
            <h3 id={e.anchor} className="text-lg wrap-anywhere">
                <code>GET {e.path}</code>
            </h3>
            <p>{e.summary}</p>

            {e.params.length > 0 && (
                <div className="space-y-2">
                    <h4>Parameters</h4>
                    <dl className="space-y-3">
                        {e.params.map((p) => (
                            <div key={p.name}>
                                <dt>
                                    <code className={CODE}>{p.name}</code>{" "}
                                    <span className="text-sm text-[var(--muted)]">
                                        {[p.in, p.type, p.required ? "required" : "", p.default ? `default ${p.default}` : ""]
                                            .filter(Boolean)
                                            .join(", ")}
                                    </span>
                                </dt>
                                {p.description && <dd className="pl-4">{p.description}</dd>}
                            </div>
                        ))}
                    </dl>
                </div>
            )}

            <div className="space-y-2">
                <h4>Returns</h4>
                {e.returns.kind === "hsds" ? (
                    <p>
                        {e.returns.list ? "A page of HSDS " : "One HSDS "}
                        <a href={e.returns.url} className={LINK}>
                            <code className={CODE}>{e.returns.schema}</code>
                        </a>
                        {e.returns.list ? " records." : " record."}
                    </p>
                ) : (
                    <Fields fields={e.returns.fields} />
                )}
            </div>

            {e.example && (
                <p>
                    Try it: <a href={e.example} className={`${LINK} font-mono text-sm wrap-anywhere`}>{e.example}</a>
                </p>
            )}
        </section>
    );
}

function Fields({ fields }: { fields: Field[] }) {
    return (
        <dl className="space-y-3">
            {fields.map((f) => (
                <div key={f.name}>
                    <dt>
                        <code className={CODE}>{f.name}</code>{" "}
                        <span className="text-sm text-[var(--muted)]">{f.type}</span>
                    </dt>
                    {f.description && <dd className="pl-4">{f.description}</dd>}
                    {f.fields && (
                        <dd className="pl-4 mt-3">
                            <Fields fields={f.fields} />
                        </dd>
                    )}
                </div>
            ))}
        </dl>
    );
}
