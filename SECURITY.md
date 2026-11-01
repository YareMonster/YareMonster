# Security

## Reporting a vulnerability

If you believe you have found a security problem in a Yare Monster app, please report it privately:

**hola@yare.monster**

Include:

- the app and the version or commit you looked at,
- what the problem is and what an attacker could do with it,
- safe steps to reproduce it, or a description if the steps would expose data.

Please do not include credentials, personal data, database contents or working exploit code. A
description is enough to start. Please do not open a public issue for a vulnerability until it has
been addressed.

This is a one-person project, so there is no security team and no guaranteed response time.
Reports are read and taken seriously; fixes ship as commits to this repository and are noted in
the relevant app's documentation.

## What a report cannot cover

Yare Monster does not operate anyone's deployment. The apps run in each operator's own Supabase
project and Cloudflare account. A problem with a specific deployment's configuration, exposed keys
or data handling is for that operator to fix; the documentation in each app's `DEPLOYMENT.md`
explains the access controls that deployment should have.

## For operators

- Keep the publishable key public and everything else secret. A `VITE_` variable ends up in the
  browser bundle. Service-role keys and database passwords never belong there.
- Keep row-level security enabled on every table. The migrations turn it on; do not turn it off to
  make something work.
- Disable sign-ups in Supabase Auth for single-operator apps and create the one account yourself.
- Update dependencies and redeploy when a fix lands. Pin a version, read what changed, then update.
