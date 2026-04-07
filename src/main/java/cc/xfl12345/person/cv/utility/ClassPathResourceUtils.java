package cc.xfl12345.person.cv.utility;

import lombok.Builder;

import java.io.File;
import java.io.IOException;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;
import java.util.stream.Stream;

public class ClassPathResourceUtils {
    private static final URL HACK_URL;

    static {
        try {
            HACK_URL = URI.create("jar:file://somehost/somejar.jar!/").toURL();
        } catch (MalformedURLException e) {
            throw new RuntimeException(e);
        }
    }

    public sealed interface PathDetail permits UrlPathDetail {
        String path();
        String relativePath();
        String fileName();
        boolean directory();
        boolean file();
    }

    @Builder
    public record UrlPathDetail(
        URL url,
        String path,
        String relativePath,
        String fileName,
        boolean directory,
        boolean file
    ) implements PathDetail {}

    @Builder
    public record FindOption(
        Predicate<? super UrlPathDetail> filter,
        Boolean recursive,
        ClassLoader classLoader,
        Boolean crudeMode
    ) {
        public FindOption {
            if (filter == null) {
                filter = item -> true;
            }
            if (recursive == null) {
                recursive = true;
            }
            if (classLoader == null) {
                classLoader = Thread.currentThread().getContextClassLoader();
            }
            if (crudeMode == null) {
                Module module = classLoader.getClass().getModule();
                crudeMode = module != null
                    && module.getName() != null
                    && module.getName().startsWith("java");
            }
        }
    }

    private static class JarFileUrlCache {
        private final JarURLConnection jarURLConnection;

        private final JarFile jarFile;

        private final URL url;

        private final URL jarFileRootUrl;

        public JarFileUrlCache(JarURLConnection jarURLConnection, boolean crudeMode) throws IOException, URISyntaxException {
            this.jarURLConnection = jarURLConnection;
            this.jarFile = jarURLConnection.getJarFile();
            this.url = jarURLConnection.getURL();

            JarEntry jarEntry = jarURLConnection.getJarEntry();
            if (jarEntry == null) {
                this.jarFileRootUrl = this.url;
            } else {
                String jarEntryName = jarEntry.getName();

                if (crudeMode) {
                    String urlInString = url.toString();
                    String rootUrlInString = urlInString.substring(0, urlInString.length() - jarEntryName.length());
                    this.jarFileRootUrl = URI.create(rootUrlInString).toURL();
                } else {
                    int folderCount = 0;
                    for (int i = 0; i < jarEntryName.length(); i += 1) {
                        if (jarEntryName.charAt(i) == '/') {
                            folderCount += 1;
                        }
                    }
                    String goToRootPath = "../".repeat(folderCount);
                    this.jarFileRootUrl = url.toURI().resolve(goToRootPath).toURL();
                }

            }
        }

        public JarURLConnection getJarURLConnection() {
            return jarURLConnection;
        }

        public JarFile getJarFile() {
            return jarFile;
        }

        public URL getUrl() {
            return url;
        }

        public URL getJarFileRootUrl() {
            return jarFileRootUrl;
        }
    }

    public static String getJarFileUriRelativizePath(URI base, URI child) throws URISyntaxException {
        return (new URI(base.getRawSchemeSpecificPart())).relativize(new URI(child.getRawSchemeSpecificPart())).getPath();
    }

    public static String getFileUriRelativizePath(URI base, URI child) {
        return base.relativize(child).getPath();
    }

    private static FileSystem createFileSystem(URI uri, ClassLoader classLoader) {
        FileSystem fileSystem = null;
        try {
            fileSystem = FileSystems.newFileSystem(uri, Map.of(), classLoader);

            // 注册 JVM 关闭钩子。有始有终。
            FileSystem finalFileSystem = fileSystem;
            Thread shutdownHook = new Thread(() -> {
                try {
                    Class<?> fileSystemClass = finalFileSystem.getClass();
                    if (finalFileSystem.isOpen()) {
                        finalFileSystem.close();
                    }
                    // do something
                    System.out.printf("FileSystem [%s] closed safety.%n", fileSystemClass.getCanonicalName());
                } catch (Exception e) {
                    e.printStackTrace();
                }
            });
            Runtime.getRuntime().addShutdownHook(shutdownHook);
        } catch (IOException | FileSystemAlreadyExistsException | IllegalArgumentException e) {
            // ignore
        }

        return fileSystem;
    }

    private static FileSystem getFileSystem(URI uri, URI noPathUri) {
        if (uri != null) {
            try {
                return FileSystems.getFileSystem(uri);
            } catch (FileSystemNotFoundException | IllegalArgumentException e) {
                // ignore
            }
        }

        try {
            return FileSystems.getFileSystem(noPathUri);
        } catch (FileSystemNotFoundException | IllegalArgumentException e) {
            // ignore
        }

        return null;
    }

    public static FileSystem getFileSystemViaURL(URL url, ClassLoader classLoader) {
        URI uri = null;
        URI noPathUri = URI.create(url.getProtocol() + ":/");

        try {
            uri = url.toURI();
        } catch (URISyntaxException e) {
            // ignore
        }

        FileSystem fileSystem = getFileSystem(uri, noPathUri);
        if (fileSystem == null) {
            if (uri != null) {
                fileSystem = createFileSystem(uri, classLoader);
            }

            if (fileSystem == null) {
                fileSystem = createFileSystem(noPathUri, classLoader);
            }

            if (fileSystem == null) {
                fileSystem = getFileSystem(uri, noPathUri);
            }
        }

        return fileSystem;
    }

    private static Map<String, URL> internalFindResourceViaFile(
        final File originRoot,
        final File currentRoot,
        final String baseClassPath,
        FindOption option,
        boolean isGetURL) throws MalformedURLException {
        // 如果不存在，直接返回
        if (!currentRoot.exists()) {
            return Collections.emptyMap();
        }

        // 目标对象就是文件，不需要遍历
        if (originRoot.isFile()) {
            String fileName = originRoot.getName();
            URI fileURI = originRoot.toURI();
            URL fileURL = isGetURL ? fileURI.toURL() : HACK_URL;
            if (option.filter().test(new UrlPathDetail(fileURL, baseClassPath, "", fileName, false, true))) {
                return Map.of(baseClassPath, fileURL);
            }

            return Collections.emptyMap();
        }

        Map<String, URL> urls = new ConcurrentHashMap<>();
        String[] fileNames = currentRoot.list();
        if (fileNames != null) {
            try {
                // 遍历所有文件
                Arrays.asList(fileNames).parallelStream().forEach(fileName -> {
                    try {
                        File file = new File(currentRoot, fileName);
                        // 如果是个文件夹
                        if (file.isDirectory()) {
                            if (option.recursive()) {
                                urls.putAll(internalFindResourceViaFile(originRoot, file, baseClassPath, option, isGetURL));
                            }
                        } else {
                            URI fileURI = file.toURI();
                            URL fileURL = isGetURL ? fileURI.toURL() : HACK_URL;
                            String relativeFilePath = getFileUriRelativizePath(originRoot.toURI(), fileURI);
                            String path = baseClassPath + '/' + relativeFilePath;
                            if (option.filter().test(new UrlPathDetail(fileURL, path, relativeFilePath, fileName, file.isDirectory(), file.isFile()))) {
                                urls.put(path, fileURL);
                            }
                        }
                    } catch (MalformedURLException urlException) {
                        throw new RuntimeException(urlException);
                    }
                });
            } catch (RuntimeException runtimeException) {
                Throwable throwable = runtimeException.getCause();
                if (throwable instanceof MalformedURLException urlException) {
                    throw urlException;
                }
                throw runtimeException;
            }
        }

        return urls;
    }


    public static Map<String, URL> findResourceUrlViaJarURLConnection(
        JarURLConnection jarURLConnection,
        FindOption option) throws IOException, URISyntaxException {
        return internalFindResourceViaJarURLConnection(jarURLConnection, option, true);
    }

    public static Set<String> findResourcePathViaJarURLConnection(
        JarURLConnection jarURLConnection,
        FindOption option) throws IOException, URISyntaxException {
        return internalFindResourceViaJarURLConnection(jarURLConnection, option, false).keySet();
    }

    private static Map<String, URL> internalFindResourceViaJarURLConnection(
        JarURLConnection jarURLConnection,
        FindOption option,
        boolean isGetURL) throws IOException, URISyntaxException {
        // 注意！这里不能使用 jarURLConnection.getEntryName() ！因为无法判断是否是目录。
        // 使用 jarURLConnection.getJarEntry().getName() ，如果目标对象是目录，将自动补全末尾的左斜杠'/'
        String originRoot = jarURLConnection.getJarEntry().getName();

        // 判断一下是否是目录
        if (!originRoot.isEmpty() && originRoot.charAt(originRoot.length() - 1) == '/') {
            URL originURL = jarURLConnection.getURL();
            String originUrlInString = originURL.toString();
            // 判断原 URL 是否以 左斜杠'/' 结尾。若不是，则需补上，以此基础重新生成 URL 。
            if (originUrlInString.charAt(originUrlInString.length() - 1) != '/') {
                URL okURL = originURL.toURI().resolve("./").toURL();
                jarURLConnection = (JarURLConnection) okURL.openConnection();
            }

            JarFileUrlCache jarFileUrlCache = new JarFileUrlCache(jarURLConnection, option.crudeMode());

            return internalFindResourceUrlViaJarURLConnection(
                jarFileUrlCache,
                originRoot,
                option,
                isGetURL
            );

        } else {
            // 不是目录，直接返回该URL
            Map<String, URL> urls = new HashMap<>(1);
            urls.put(originRoot, jarURLConnection.getURL());
            return urls;
        }
    }

    private static Map<String, URL> internalFindResourceUrlViaJarURLConnection(
        final JarFileUrlCache jarFileUrlCache,
        String originRoot,
        FindOption option,
        boolean isGetURL) throws IOException {

        Map<String, URL> urls = new ConcurrentHashMap<>();

        try {
            JarFile jarFile = jarFileUrlCache.getJarFile();
            URL jarFileRootUrl = jarFileUrlCache.getJarFileRootUrl();
            URI jarFileRootUri = jarFileRootUrl.toURI();

            Function<String, URL> mergeURL = isGetURL
                    ? thePath -> {
                try {
                    return jarFileRootUri.resolve(thePath).toURL();
                } catch (MalformedURLException e) {
                    throw new RuntimeException(e);
                }
            }
            : (_) -> HACK_URL;

            // Java 17 底层实现是加了 synchronized 同步锁的，并行操作可能意义不大
            // 目前考虑先用CPU单核心加载全部 JarEntry ，然后再用CPU多核心并行遍历全部 JarEntry
            // 耗时可能变成 O(2n) ，但应该取决于 JarEntry 数量和 CPU核心数量， 两者越大可能耗时越少。
            Collections.list(jarFile.entries()).parallelStream().forEach(jarEntry -> {
                // jarFile.stream().parallel().forEach(jarEntry -> {
                // jarFile.stream().forEach(jarEntry -> {
                String jarFileInternalPath = jarEntry.getName();
                // 切入指定前缀
                if (jarFileInternalPath.startsWith(originRoot)) {
                    // 提取当前对象相对于给定根的路径
                    // jarFileInternalPath 是以 Jar 包为根的路径
                    // 后面的 +1 是为了去掉一定会有的 '/'
                    String relativeFilePath = jarFileInternalPath.substring(originRoot.length());
                    // 若是指定的根目录
                    if (!relativeFilePath.isEmpty()) {
                        int lastIndexOfSplitChar = relativeFilePath.lastIndexOf('/');
                        // 是否位于当前目录
                        boolean isInCurrentFolder = lastIndexOfSplitChar < 0;
                        // // 如果不是以 左斜杠'/'，则是文件
                        // boolean isFile = relativeFilePath.charAt(relativeFilePath.length() - 1) != '/';
                        boolean isDirectory = jarEntry.isDirectory();
                        boolean isFile = !isDirectory;
                        // 以下两种情况会被允许进入分支。
                        // 1.允许递归（无需考虑是否位于子目录）
                        // 2.位于当前目录的对象（无需考虑是否允许递归 ）
                        // 当且仅当 "不允许递归" 又 "对象位于子目录"，才会被拒绝进入分支。
                        if (option.recursive() || isInCurrentFolder) {
                            String fileName = isFile ?
                                relativeFilePath : relativeFilePath.substring(lastIndexOfSplitChar + 1);
                            // jar包根目录的URL + jar包内路径 = 目标文件路径
                            URL fileURL = mergeURL.apply(jarFileInternalPath);
                            if (option.filter().test(new UrlPathDetail(fileURL, jarFileInternalPath, relativeFilePath, fileName, isDirectory, isFile))) {
                                urls.put(jarFileInternalPath, fileURL);
                            }
                        }
                    } else {
                        URL fileURL = mergeURL.apply(jarFileInternalPath);
                        if (option.filter().test(new UrlPathDetail(fileURL, jarFileInternalPath, relativeFilePath, "", true, false))) {
                            urls.put(jarFileInternalPath, fileURL);
                        }
                    }
                }
            });
        } catch (RuntimeException runtimeException) {
            if (runtimeException.getCause() instanceof IOException e) {
                throw e;
            }
            throw runtimeException;
        } catch (URISyntaxException e) {
            throw new RuntimeException(e);
        }

        return urls;
    }


    public static Map<String, URL> findResourceUrlViaFileSystem(
        final FileSystem fileSystem,
        final String rootPath,
        FindOption option) throws IOException {
        return internalFindResourceUrlViaFileSystem(fileSystem, rootPath, option, true);
    }

    public static Set<String> findResourcePathViaFileSystem(
        final FileSystem fileSystem,
        final String rootPath,
        FindOption option) throws IOException {
        return internalFindResourceUrlViaFileSystem(fileSystem, rootPath, option, false).keySet();
    }

    private static Map<String, URL> internalFindResourceUrlViaFileSystem(
        final FileSystem fileSystem,
        final String rootPath,
        FindOption option,
        boolean isGetURL) throws IOException {

        Map<String, URL> urls = new ConcurrentHashMap<>();

        Path fileSystemPath = fileSystem.getPath(rootPath);
        try (Stream<Path> pathStream = Files.walk(fileSystemPath).parallel()) {
            pathStream.forEach(path -> {
                String pathInText = path.toString();
                Path pathFileName = path.getFileName();
                String fileName = pathFileName == null ? "" : pathFileName.toString();
                String relativeFilePath = pathInText.substring(rootPath.length());
                if (!relativeFilePath.isEmpty()) {
                    int lastIndexOfSplitChar = relativeFilePath.lastIndexOf('/');
                    // 是否位于当前目录
                    boolean isInCurrentFolder = lastIndexOfSplitChar < 0;
                    if (option.recursive() || isInCurrentFolder) {
                        URL fileURL = isGetURL ? option.classLoader().getResource(pathInText) : HACK_URL;
                        if (fileURL != null && option.filter().test(new UrlPathDetail(fileURL, pathInText, relativeFilePath, fileName, Files.isDirectory(path), Files.isRegularFile(path)))) {
                            urls.put(pathInText, fileURL);
                        }
                    }
                } else {
                    URL fileURL = isGetURL ? option.classLoader().getResource(pathInText) : HACK_URL;
                    if (fileURL != null && option.filter().test(new UrlPathDetail(fileURL, rootPath, relativeFilePath, fileName, Files.isDirectory(path), Files.isRegularFile(path)))) {
                        urls.put(rootPath, fileURL);
                    }
                }
            });
        }

        return urls;
    }

    /**
     * @return Map(path, Map ( relativePath, URL))
     */
    public static Map<String, Map<String, URL>> getURL(String path, FindOption option) throws IOException {
        // 定义一个枚举的集合 并进行循环来处理这个目录下的东西
        Enumeration<URL> dirs = option.classLoader().getResources(path);
        Map<String, Map<String, URL>> urls = new ConcurrentHashMap<>();

        List<URL> dirsList = Collections.list(dirs);

        // 遍历
        try {
            dirsList.parallelStream().forEach(url -> {
                Map<String, URL> map = Collections.emptyMap();
                try {
                    // 得到协议的名称
                    String protocol = url.getProtocol();
                    // 如果是以文件的形式保存在服务器上
                    if ("file".equals(protocol)) {
                        // 以文件的方式扫描整个classpath下的文件 并添加到集合中
                        File file = new File(URLDecoder.decode(url.getFile(), StandardCharsets.UTF_8));
                        map = internalFindResourceViaFile(file, file, path, option, true);
                    } else if ("jar".equals(protocol)) {
                        // 如果是jar包文件
                        JarURLConnection jarURLConnection = (JarURLConnection) url.openConnection();
                        map = findResourceUrlViaJarURLConnection(jarURLConnection, option);
                    } else {
                        FileSystem fileSystem = Objects.requireNonNull(getFileSystemViaURL(url, option.classLoader()));
                        map = findResourceUrlViaFileSystem(fileSystem, path, option);
                    }
                } catch (IOException | URISyntaxException e) {
                    throw new RuntimeException(e);
                } finally {
                    urls.put(url.toString(), map);
                }
            });
        } catch (RuntimeException runtimeException) {
            Throwable throwable = runtimeException.getCause();
            if (throwable instanceof IOException ioException) {
                throw ioException;
            }

            throw runtimeException;
        }

        return urls;
    }


    public static Map<String, Map<String, URL>> getURL(String path) throws IOException {
        return getURL(path, FindOption.builder().build());
    }

    public static Map<String, Set<String>> listPath2File(String path, FindOption option) throws IOException {
        // 定义一个枚举的集合 并进行循环来处理这个目录下的东西
        List<URL> dirs = Collections.list(option.classLoader().getResources(path));
        ConcurrentHashMap<String, Set<String>> paths = new ConcurrentHashMap<>();

        // 遍历
        try {
            dirs.parallelStream().forEach(url -> {
                Set<String> set = Collections.emptySet();
                try {
                    // 得到协议的名称
                    String protocol = url.getProtocol();
                    // 如果是以文件的形式保存在服务器上
                    if ("file".equals(protocol)) {
                        // 以文件的方式扫描整个classpath下的文件 并添加到集合中
                        File file = new File(URLDecoder.decode(url.getFile(), StandardCharsets.UTF_8));
                        set = internalFindResourceViaFile(file, file, path, option, false).keySet();
                    } else if ("jar".equals(protocol)) {
                        // 如果是jar包文件
                        JarURLConnection jarURLConnection = (JarURLConnection) url.openConnection();
                        set = findResourcePathViaJarURLConnection(jarURLConnection, option);
                    } else {
                        FileSystem fileSystem = Objects.requireNonNull(getFileSystemViaURL(url, option.classLoader()));
                        set = findResourcePathViaFileSystem(fileSystem, path, option);
                    }
                } catch (IOException | URISyntaxException e) {
                    throw new RuntimeException(e);
                } finally {
                    paths.put(url.toString(), set);
                }
            });
        } catch (RuntimeException runtimeException) {
            Throwable throwable = runtimeException.getCause();
            if (throwable instanceof IOException ioException) {
                throw ioException;
            }

            throw runtimeException;
        }

        return paths;
    }


    public static Map<String, Set<String>> listPath2File(String path) throws IOException {
        return listPath2File(path, FindOption.builder().build());
    }
}
