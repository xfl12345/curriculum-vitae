package cc.xfl12345.person.cv.utility;

import java.net.URLEncoder;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;

import org.apache.commons.lang3.StringUtils;

public class StringEscapeUtils {
    public static final HashMap<String, HashMap<Character, byte[]>> byteMapper = new HashMap<>();
    public static final HashMap<String, HashMap<Character, String>> urlEscapeMapper = new HashMap<>();
    public static final HashMap<String, HashMap<Character, String>> sqlEscape4LikeMapper = new HashMap<>();

    static {
        char[] charList = "()`~!@#$%^&*-=_+=|{}[]:;'<>,.? /".toCharArray();
        Charset[] charsets = {
            StandardCharsets.UTF_8, StandardCharsets.ISO_8859_1, StandardCharsets.US_ASCII,
            StandardCharsets.UTF_16, StandardCharsets.UTF_16BE, StandardCharsets.UTF_16LE
        };
        for (Charset charset : charsets) {
            String charsetName = charset.name();
            HashMap<Character, byte[]> hashMap = new HashMap<>();
            HashMap<Character, String> hashMap4URL = new HashMap<>();
            for (Character ch : charList) {
                String charInString = "" + ch;
                hashMap.put(ch, charInString.getBytes(charset));
                hashMap4URL.put(ch, URLEncoder.encode(charInString, charset));
            }
            byteMapper.put(charsetName, hashMap);
            urlEscapeMapper.put(charsetName, hashMap4URL);
        }
        HashMap<Character, String> mysqlEscape = new HashMap<>();
        mysqlEscape.put('%', "\\%");
        mysqlEscape.put('_', "\\_");
        sqlEscape4LikeMapper.put("mysql", mysqlEscape);
    }

    public static String escapeBracketsOnly4URL(String content) {
        HashMap<Character, String> charMapper = urlEscapeMapper.get(StandardCharsets.ISO_8859_1.name());
        if (charMapper == null || StringUtils.isEmpty(content)) return content;
        StringBuilder sb = new StringBuilder(content.length() << 1);
        for (int i = 0; i < content.length(); i++) {
            char currChar = content.charAt(i);
            if (currChar == '[' || currChar == ']' || currChar == '{' || currChar == '}') {
                sb.append(charMapper.get(currChar));
            } else {
                sb.append(currChar);
            }
        }
        return sb.toString();
    }

    public static String escapeSql4Like(String sqlDialect, String content) {
        HashMap<Character, String> charMapper = sqlEscape4LikeMapper.get(sqlDialect);
        if (charMapper == null || StringUtils.isEmpty(content)) return content;
        StringBuilder sb = new StringBuilder(content.length() << 1);
        for (int i = 0; i < content.length(); i++) {
            char currChar = content.charAt(i);
            String replacement = charMapper.get(currChar);
            sb.append(replacement != null ? replacement : currChar);
        }
        return sb.toString();
    }
}
