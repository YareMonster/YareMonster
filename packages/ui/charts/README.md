# Charts

The chart pieces of the Yare Monster design system, built on Recharts. They live apart from
`packages/ui/src` because only dashboards need a chart library: `npm run sync-ui` copies this
folder to `src/yare-charts` in every app whose `package.json` depends on `recharts`, and nowhere
else. Import them with `from '../yare-charts'`. Colours and fonts come from the Yare Monster tokens.
