import 'server-only';

// The only entry app code may import. `server-only` turns a client import into a build error.
export { sendEmail } from './send';
export type { SendEmailInput, SendEmailResult, SendEmailError } from './send';
export type { TemplateName, TemplateProps, PropsMap } from './registry';
