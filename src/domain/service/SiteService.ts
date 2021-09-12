import { container, singleton } from 'tsyringe';
import { Ref, shallowRef, InjectionKey, ref, toRaw } from 'vue';
import { Theme, DEFAULT_THEME_NAME } from '../model/Theme';
import { Site, DEFAULT_SITE } from '../model/Site';
import { PluginDataRepository } from '../repository/PluginDataRepository';
import { ExceptionService } from './ExceptionService';
import { merge, defaults, isEmpty, map } from 'lodash';

export const token: InjectionKey<SiteService> = Symbol('siteService');
@singleton()
export class SiteService {
  private readonly pluginDataRepository = new PluginDataRepository();
  private readonly exceptionService = container.resolve(ExceptionService);
  readonly site: Ref<Site | null> = ref(null);
  readonly themes: Ref<Theme[]> = shallowRef([]);
  readonly themeConfig: Ref<Theme | null> = shallowRef(null);

  constructor() {
    this.init();
  }

  private async init() {
    this.themes.value = await this.pluginDataRepository.getThemes();
    this.site.value = {
      ...DEFAULT_SITE,
      ...(await this.pluginDataRepository.getSite()),
    };

    const { themeName } = this.site.value;
    await this.loadTheme(themeName);
  }

  async loadTheme(themeName: string) {
    if (!this.site.value) {
      throw new Error('site is not ready when load theme');
    }

    try {
      this.themeConfig.value = await this.pluginDataRepository.getTheme(themeName);

      const { siteFields } = this.themeConfig.value;

      // todo: if ant-design-vue support validating non-existed props, following code can be removed
      if (!isEmpty(siteFields)) {
        const { custom } = this.site.value;
        custom[themeName] = defaults(
          custom[themeName],
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          map(siteFields!, 'name').reduce((result, name) => {
            result[name] = null;
            return result;
          }, {} as Record<string, null>),
        );
      }
    } catch (error) {
      this.themeConfig.value =
        this.themeConfig.value || (await this.pluginDataRepository.getTheme(DEFAULT_THEME_NAME));
      this.exceptionService.reportError(error as Error, { title: 'Fail to load theme' });
    }
  }

  async saveSite(site?: Partial<Site>) {
    const siteData = merge(this.site.value, site);
    await this.pluginDataRepository.saveSite(toRaw(siteData));
  }
}
