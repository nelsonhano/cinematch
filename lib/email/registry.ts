import type { ComponentType } from 'react';
import TestEmail, { type TestEmailProps } from './templates/test';

/** One line per email: template name to its props type. */
export interface PropsMap {
  test: TestEmailProps;
}

export type TemplateName = keyof PropsMap;
export type TemplateProps<N extends TemplateName> = PropsMap[N];

export interface TemplateDefinition<P> {
  component: ComponentType<P>;
  subject: (props: P) => string;
}

export const templates: { [N in TemplateName]: TemplateDefinition<PropsMap[N]> } = {
  test: {
    component: TestEmail,
    subject: () => 'CineMatch test email',
  },
};
