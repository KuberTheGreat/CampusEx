<!-- BEGIN:nextjs-agent-rules -->
# Next.js & React 19 Best Practices
This project uses Next.js App Router and React 19.
- **Server Components by Default**: Default to React Server Components (RSC) to reduce client javascript footprint. Use `use client` only when interactivity, context, or hooks are necessary.
- **Data Fetching**: Use standard `fetch` or direct database connections inside Server Components. Avoid `useEffect` for data fetching. Use React `cache` for deduping requests.
- **React 19 Actions**: Use React Server Actions for data mutations instead of API Routes where possible. e.g. `async function mutateData(formData: FormData) { 'use server'; ... }`.
- **Transitions**: Use `useTransition` for non-blocking UI updates when performing mutations.
- **Caching**: Understand Next.js caching. Understand Request Memoization, Data Cache, and Full Route Cache. Use `revalidatePath` and `revalidateTag` to purge caches when mutations occur.

# Web Design Guidelines & UI Patterns
- **Aesthetic**: Follow modern dynamic design aesthetics with standard spacing, subtle borders, and harmonious colors. Focus on micro-animations and accessibility.
- **Tailwind v4**: Use Tailwind CSS (v4) utility classes. Adhere to the established CSS variables in `index.css`/`globals.css`.
- **Components**: Create specialized reusable UI components using Tailwind and Radix/Lucide icons. Avoid arbitrary magic numbers for padding/margins.

# Deployment (Vercel)
- **Edge Regions**: Note that Vercel Serverless/Edge functions should be optimized for startup time.
- **Environment Variables**: Never commit secrets. Ensure new API keys are added securely.

<!-- END:nextjs-agent-rules -->
