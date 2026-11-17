export function Section({ id, eyebrow, title, lede, children }: { id: string; eyebrow: string; title: string; lede?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="pt-16" aria-labelledby={`${id}-h`}>
      <div className="eyebrow">{eyebrow}</div>
      <h2 id={`${id}-h`} className="serif text-3xl md:text-4xl font-semibold tracking-tight mt-1 max-w-3xl" style={{ textWrap: "balance" }}>{title}</h2>
      {lede && <p className="mt-3 max-w-3xl" style={{ color: "var(--muted)" }}>{lede}</p>}
      <div className="mt-8">{children}</div>
    </section>
  );
}

export function Panel({ title, source, note, children, className = "" }: { title: string; source: string; note?: string; children: React.ReactNode; className?: string }) {
  return (
    <figure className={`card p-5 md:p-6 ${className}`}>
      <figcaption>
        <h3 className="serif text-xl font-semibold leading-snug" style={{ textWrap: "balance" }}>{title}</h3>
      </figcaption>
      <div className="mt-4">{children}</div>
      {note && <p className="note"><b>Limits.</b> {note}</p>}
      <p className="src">Source: {source}</p>
    </figure>
  );
}

export function Legend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm mb-2" aria-label="Legend">
      {items.map((i) => (
        <li key={i.name} className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: i.color }} />{i.name}
        </li>
      ))}
    </ul>
  );
}
