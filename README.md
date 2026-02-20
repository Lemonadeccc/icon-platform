This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Publishing

The "确认发布" button triggers CI/CD to publish the `icons` package to npm.

### App Environment Variables

- `GITHUB_OWNER`: GitHub org/user name.
- `GITHUB_REPO`: GitHub repository name.
- `GITHUB_TOKEN`: GitHub token with `workflow` and `contents` scopes.
- `GITHUB_WORKFLOW` (optional): workflow file name, default `publish-icons.yml`.
- `GITHUB_REF` (optional): ref to dispatch, default `main`.

### OIDC Trusted Publishing

Configure the npm package to trust this GitHub Actions workflow as a publisher.
No `NPM_TOKEN` secret is required when OIDC is enabled.

### Outputs

- `icons/react`: React icon components
- `icons/svg`: normalized SVG assets
- `icons/font`: iconfont output
- `icons/meta.json`: icon metadata
- `icons/publish.json`: publish record

## Usage

Install:

```bash
npm install @condev-ui/icons
```

Use a specific icon:

```tsx
import { AlignCenter } from "@condev-ui/icons";

export default function Demo() {
  return <AlignCenter size="20px" useFillCurrentColor />;
}
```

Use dynamic by name:

```tsx
import { Icon } from "@condev-ui/icons";

export default function Demo() {
  return <Icon name="AlignCenter" size="20px" useFillCurrentColor />;
}
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
