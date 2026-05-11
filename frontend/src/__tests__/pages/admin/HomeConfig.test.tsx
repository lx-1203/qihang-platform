import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import HomeConfig from '../../../pages/admin/HomeConfig';

const { getMock, postMock, fetchConfigsMock, successMock, errorMock, warningMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  fetchConfigsMock: vi.fn(),
  successMock: vi.fn(),
  errorMock: vi.fn(),
  warningMock: vi.fn(),
}));

vi.mock('../../../api/http', () => ({
  default: {
    get: getMock,
    post: postMock,
  },
}));

vi.mock('../../../components/ui', async () => {
  const actual = await vi.importActual<typeof import('../../../components/ui')>('../../../components/ui');

  return {
    ...actual,
    useToast: () => ({
      success: successMock,
      error: errorMock,
      warning: warningMock,
    }),
  };
});

vi.mock('../../../components/ui/FileUpload', () => ({
  default: () => <div>mock file upload</div>,
}));

vi.mock('../../../store/config', () => ({
  useConfigStore: (selector: (state: { fetchConfigs: typeof fetchConfigsMock }) => unknown) =>
    selector({ fetchConfigs: fetchConfigsMock }),
}));

vi.mock('../../../utils/connectionStatus', () => ({
  handleApiFailure: vi.fn(),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

describe('Admin HomeConfig', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    fetchConfigsMock.mockReset();
    successMock.mockReset();
    errorMock.mockReset();
    warningMock.mockReset();

    getMock.mockResolvedValue({
      data: {
        code: 200,
        data: {
          home_ui_config: JSON.stringify({
            _meta: {
              version: '1.0',
              lastUpdated: '2026-05-06',
              description: 'test',
            },
            homeHero: {
              badge: '远端品牌标识',
              title: '远端 Hero 标题',
              description: '远端 Hero 描述',
            },
            homeAdPanel: {
              eyebrow: '远端广告眉题',
              title: '远端广告标题',
              description: '远端广告描述',
            },
            textResources: {
              sections: {
                valueProposition: {
                  title: '远端摘要标题',
                  subtitle: '远端摘要副标题',
                },
              },
            },
          }),
        },
      },
    });
    postMock.mockResolvedValue({ data: { code: 200 } });
  });

  it('renders the minimalist home config sections and hydrates current config fields', async () => {
    render(
      <MemoryRouter>
        <HomeConfig />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '首页配置管理' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '品牌广告区' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '核心摘要文案' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Hero|快捷入口|平台数据|平台价值/i })).not.toBeInTheDocument();

    expect(screen.getByLabelText('品牌角标')).toHaveValue('远端品牌标识');
    expect(screen.getByLabelText('广告标题')).toHaveValue('远端广告标题');

    await userEvent.click(screen.getByRole('tab', { name: '核心摘要文案' }));

    expect(screen.getByLabelText('摘要标题')).toHaveValue('远端摘要标题');
    expect(screen.getByLabelText('摘要副标题')).toHaveValue('远端摘要副标题');
  });

  it('saves only the minimalist home config structure', async () => {
    render(
      <MemoryRouter>
        <HomeConfig />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: '首页配置管理' });

    await userEvent.clear(screen.getByLabelText('品牌角标'));
    await userEvent.type(screen.getByLabelText('品牌角标'), '更新后的品牌角标');
    await userEvent.clear(screen.getByLabelText('广告描述'));
    await userEvent.type(screen.getByLabelText('广告描述'), '更新后的广告描述');

    await userEvent.click(screen.getByRole('tab', { name: '核心摘要文案' }));
    await userEvent.clear(screen.getByLabelText('摘要标题'));
    await userEvent.type(screen.getByLabelText('摘要标题'), '新的摘要标题');

    await userEvent.click(screen.getByRole('button', { name: '保存配置' }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledTimes(1);
    });

    const payload = postMock.mock.calls[0][1];
    const savedConfig = JSON.parse(payload.configs.home_ui_config);

    expect(savedConfig.homeHero.badge).toBe('更新后的品牌角标');
    expect(savedConfig.homeAdPanel.description).toBe('更新后的广告描述');
    expect(savedConfig.textResources.sections.valueProposition.title).toBe('新的摘要标题');
    expect(savedConfig).not.toHaveProperty('heroSlides');
    expect(savedConfig).not.toHaveProperty('quickEntries');
    expect(savedConfig).not.toHaveProperty('stats');
    expect(savedConfig).not.toHaveProperty('valueSections');
    expect(fetchConfigsMock).toHaveBeenCalledWith(true);
    expect(successMock).toHaveBeenCalled();
  });
});
