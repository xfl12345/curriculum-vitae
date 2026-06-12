package cc.xfl12345.person.cv;

import cc.xfl12345.person.cv.pojo.database.MeetHr;
import cc.xfl12345.person.cv.service.UserService;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;

import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Random;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Stream;

@Disabled
@QuarkusTest
public class BatchUserInsertTool {

    private static final int TOTAL_COUNT = 2000;
    private static final ZonedDateTime now = ZonedDateTime.now(ZoneOffset.UTC);

    @Inject
    UserService userService;

    private static final String[] HR_NAMES = {
        "张伟", "王芳", "李娜", "刘洋", "陈静", "杨磊", "赵敏", "黄强", "周杰", "吴秀英",
        "徐明", "孙丽", "马超", "朱红", "胡建华", "郭俊杰", "何平", "高志远", "林涛", "罗小燕",
        "梁慧", "宋文", "郑鹏", "谢军", "韩雨", "唐晓", "冯刚", "董萍", "程思远", "曹雪梅",
        "袁磊", "邓超", "许晴", "傅海峰", "沈丽华", "曾庆", "彭丹", "吕明", "苏强", "蒋琳",
    };

    private static final String[] HR_JOBS = {
        "技术总监", "HR经理", "产品经理", "前端工程师", "后端工程师", "项目经理",
        "技术经理", "架构师", "CTO", "招聘专员", "HRBP", "研发总监", "运维工程师",
        "数据工程师", "测试工程师", "UI设计师", "算法工程师", "DevOps工程师",
    };

    private static final String[] MY_JOBS = {
        "Java开发工程师", "全栈开发工程师", "高级Java工程师", "后端开发工程师",
        "资深开发工程师", "技术专家", "软件工程师", "研发工程师",
    };

    private static final String[] NOTE_TEMPLATES = {
        "通过猎头推荐认识", "在技术大会上结识", "朋友介绍", "LinkedIn上联系",
        "前同事", "技术社区认识", "校招面试官", "开源项目合作",
        "内部推荐", "技术分享会认识", "线上交流后约见", "行业论坛认识",
    };

    @Test
    void batchInsert() throws Exception {
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failCount = new AtomicInteger(0);
        Random random = new Random();

        List<MeetHr> users = Stream.generate(() -> randomMeetHr(random))
                .limit(TOTAL_COUNT)
                .toList();

        System.out.printf("开始批量插入 %d 条用户数据，虚拟线程并发%n%n", TOTAL_COUNT);
        long startTime = System.currentTimeMillis();

        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var futures = users.stream()
                    .map(user -> executor.submit(() -> {
                        try {
                            if (userService.addHrInfo(user)) {
                                int done = successCount.incrementAndGet();
                                if (done % 200 == 0) {
                                    System.out.printf("进度: %d / %d%n", done, TOTAL_COUNT);
                                }
                            } else {
                                failCount.incrementAndGet();
                                System.err.printf("插入失败: %s%n", user.getHrName());
                            }
                        } catch (Exception e) {
                            failCount.incrementAndGet();
                            System.err.printf("异常: %s - %s%n", user.getHrName(), e.getMessage());
                        }
                    }))
                    .toList();

            for (var f : futures) {
                f.get();
            }
        }

        long elapsed = System.currentTimeMillis() - startTime;
        System.out.printf("%n==================== 完成 ====================%n");
        System.out.printf("成功: %d  失败: %d  耗时: %.1fs%n", successCount.get(), failCount.get(), elapsed / 1000.0);
        System.out.printf("平均: %.1fms/条%n", (double) elapsed / TOTAL_COUNT);
    }

    private static MeetHr randomMeetHr(Random random) {
        return MeetHr.builder()
                .hrName(pick(random, HR_NAMES))
                .hrPhoneNumber(randomPhoneNumber(random))
                .hrJob(pick(random, HR_JOBS))
                .myJob(pick(random, MY_JOBS))
                .note(pick(random, NOTE_TEMPLATES))
                .createTime(now)
                .build();
    }

    private static <T> T pick(Random random, T[] pool) {
        return pool[random.nextInt(pool.length)];
    }

    private static String randomPhoneNumber(Random random) {
        String[] prefixes = {"130", "131", "132", "133", "135", "136", "137", "138", "139",
                "150", "151", "152", "153", "155", "156", "157", "158", "159",
                "170", "171", "172", "173", "175", "176", "177", "178",
                "180", "181", "182", "183", "185", "186", "187", "188", "189"};
        StringBuilder sb = new StringBuilder(pick(random, prefixes));
        for (int i = 0; i < 8; i++) {
            sb.append(random.nextInt(10));
        }
        return sb.toString();
    }
}
