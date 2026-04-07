package cc.xfl12345.person.cv.config;

import cc.xfl12345.person.cv.picture.PackageLandmark;
import cc.xfl12345.person.cv.framework.tianaicaptcha.CachedUrlResourceProvider;
import cloud.tianai.captcha.application.ImageCaptchaApplication;
import cloud.tianai.captcha.application.TACBuilder;
import cloud.tianai.captcha.resource.common.model.dto.Resource;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Produces;
import org.apache.tika.Tika;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

import java.io.IOException;
import java.net.URL;
import java.util.Objects;

@ApplicationScoped
public class CaptchaConfig {

    @Produces
    @ApplicationScoped
    public CachedUrlResourceProvider cachedUrlResourceProvider() {
        return new CachedUrlResourceProvider();
    }

    @Produces
    @ApplicationScoped
    public ImageCaptchaApplication imageCaptchaApplication(CachedUrlResourceProvider provider) {
        TACBuilder builder = TACBuilder.builder().addDefaultTemplate();
        String providerName = provider.getName();

        try {
            loadBackgroundImages(provider, builder);
        } catch (IOException e) {
            Log.error("Failed to load resources for provider[%s]".formatted(providerName), e);
        }

        ImageCaptchaApplication application = builder.build();
        application.getImageCaptchaResourceManager().registerResourceProvider(provider);
        Log.infof("TianaiCaptcha provider[%s] registered", providerName);
        return application;
    }

    /**
     * 逐个加载 classpath 下的背景图片资源
     */
    private void loadBackgroundImages(CachedUrlResourceProvider provider, TACBuilder builder) throws IOException {
        String providerName = provider.getName();
        Tika tika = new Tika();
        // 获取 classpath 路径（自适应 class 文件位置，便于重构）
        String pictureResourcePath = PackageLandmark.class.getPackage().getName().replace('.', '/');
        // 依托 Spring 强大的 classpath 通配符解析器获取资源
        var imageResources = new PathMatchingResourcePatternResolver().getResources("classpath*:%s/**".formatted(pictureResourcePath));
        for (var imageResource : imageResources) {
            String imageFileName = imageResource.getFilename();
            if (Objects.isNull(imageFileName) || imageFileName.endsWith(".class")) {
                continue;
            }

            URL imageUrl = imageResource.getURL();
            String mimeType = tika.detect(imageUrl);
            // 彻底过滤掉非图片文件
            if (!mimeType.startsWith("image/")) {
                Log.warnf("TianaiCaptcha provider[%s] skipping file[%s] MIME[%s] URL[%s]", providerName, imageFileName, mimeType, imageUrl);
                continue;
            }

            // 正式开始加载
            Log.infof("TianaiCaptcha provider[%s] loading file[%s] MIME[%s] URL[%s]", provider, imageFileName, mimeType, imageUrl);
            provider.putURL(imageFileName, imageUrl);
            builder.addResource("SLIDER", new Resource(CachedUrlResourceProvider.NAME, imageFileName));
            builder.addResource("ROTATE", new Resource(CachedUrlResourceProvider.NAME, imageFileName));
            Log.infof("TianaiCaptcha added background image: %s", imageFileName);
        }
    }
}
