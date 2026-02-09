import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import SeverityBadge from '../SeverityBadge.vue';

describe('SeverityBadge', () => {
  it('renders the severity label in uppercase', () => {
    const wrapper = mount(SeverityBadge, {
      props: { severity: 'critical' },
    });
    expect(wrapper.text()).toBe('CRITICAL');
  });

  it('applies the correct CSS class based on severity', () => {
    const wrapper = mount(SeverityBadge, {
      props: { severity: 'high' },
    });
    const badge = wrapper.find('.badge');
    expect(badge.classes()).toContain('high');
  });

  it('handles different severity levels', () => {
    const severities = ['critical', 'high', 'medium', 'low', 'info'];
    for (const severity of severities) {
      const wrapper = mount(SeverityBadge, {
        props: { severity },
      });
      expect(wrapper.text()).toBe(severity.toUpperCase());
      expect(wrapper.find('.badge').classes()).toContain(severity);
    }
  });

  it('defaults to info when severity is empty', () => {
    const wrapper = mount(SeverityBadge, {
      props: { severity: '' },
    });
    expect(wrapper.text()).toBe('INFO');
    expect(wrapper.find('.badge').classes()).toContain('info');
  });
});
