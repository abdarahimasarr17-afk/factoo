import Link from "next/link";
import { Footer } from "@/components/landing/Footer";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";

type Props = { title: string; updatedAt: string; children: React.ReactNode };

export function LegalPage({ title, updatedAt, children }: Props) {
  return (
    <>
      <header className="border-b border-border py-4">
        <Container>
          <Link href="/" aria-label="Factoo — accueil">
            <Logo />
          </Link>
        </Container>
      </header>
      <main className="py-14">
        <Container className="max-w-3xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-muted">Dernière mise à jour : {updatedAt}</p>
          <div className="mt-8 space-y-6 text-foreground [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_li]:text-muted [&_p]:text-muted [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6">
            {children}
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
