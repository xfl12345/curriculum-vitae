package cc.xfl12345.person.cv.utility;

import java.util.ArrayList;
import java.util.Collection;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MyStrIsOK {
    public static final Pattern matchLetterAndDigitOnly = Pattern.compile("^[a-z0-9A-Z]+$");
    public static final Pattern matchLetterOnly = Pattern.compile("^[a-zA-Z]+$");
    public static final Pattern matchDigitOnly = Pattern.compile("^[0-9]+$");
    public static final Pattern matchNumWithSignOnly = Pattern.compile("^(?:[-](?:[1-9]\\d+|[1-9])(?:\\.\\d+|)|(?:[1-9]\\d+|\\d)(?:\\.\\d+|))$");
    public static final Pattern matchEmailAddressOnly = Pattern.compile("^[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+\\.[a-zA-Z0-9_-]+$");
    public static final Pattern matchFilename = Pattern.compile("[^\\s\\\\/:\\*\\?\\\"<>\\|](\\x20|[^\\s\\\\/:\\*\\?\\\"<>\\|])*[^\\s\\\\/:\\*\\?\\\"<>\\|\\.]$");
    public static final Pattern containUppercaseLetter = Pattern.compile("[A-Z]");
    public static final Pattern containLowercaseLetter = Pattern.compile("[a-z]");
    public static final Pattern containLetter = Pattern.compile("[a-zA-Z]");
    public static final Pattern containNum = Pattern.compile("\\d");
    public static final Pattern containLetterAndDigit = Pattern.compile("[a-zA-Z0-9]");
    public static final Pattern containAllowedSpecialCharacter = Pattern.compile("[`~!@#$%^&*()+=|{}':;,\\[\\].\\\\<>/?---]");
    public static final Pattern containChineseInUTF8 = Pattern.compile("[\u4e00-\u9fa5]");

    public static boolean isNotEmpty(String str) { return str != null && !str.isEmpty(); }
    public static boolean isEmpty(String str) { return str == null || str.isEmpty(); }
    public static boolean arrIsOK(Collection<String> al) {
        for (String str : al) { if (str == null || str.isEmpty()) return false; }
        return true;
    }
    public static boolean isLetterDigitOnly(String str) { return isNotEmpty(str) && matchLetterAndDigitOnly.matcher(str).find(); }
    public static boolean isLetterOnly(String str) { return isNotEmpty(str) && matchLetterOnly.matcher(str).find(); }
    public static boolean isDigitOnly(String str) { return isNotEmpty(str) && matchDigitOnly.matcher(str).find(); }
    public static boolean isEmailAddress(String str) { return isNotEmpty(str) && matchEmailAddressOnly.matcher(str).find(); }
    public static boolean isContainUppercaseLetter(String str) { return isNotEmpty(str) && containUppercaseLetter.matcher(str).find(); }
    public static boolean isContainLowercaseLetter(String str) { return isNotEmpty(str) && containLowercaseLetter.matcher(str).find(); }
    public static boolean isContainNum(String str) { return isNotEmpty(str) && containNum.matcher(str).find(); }
    public static boolean isContainAllowedSpecialCharacter(String str) { return isNotEmpty(str) && containAllowedSpecialCharacter.matcher(str).find(); }
    public static boolean isContainChineseInUTF8(String str) { return isNotEmpty(str) && containChineseInUTF8.matcher(str).find(); }

    public static String removeMatchedChar(Pattern pattern, String content) {
        return pattern.matcher(content).replaceAll("").trim();
    }
    public static String removeNum(String str) { return removeMatchedChar(containNum, str); }
    public static String removeLowercaseLetter(String str) { return removeMatchedChar(containLowercaseLetter, str); }
    public static String removeUppercaseLetter(String str) { return removeMatchedChar(containUppercaseLetter, str); }
    public static String removeLetter(String str) { return removeMatchedChar(containLetter, str); }
    public static String removeLetterAndDigit(String str) { return removeMatchedChar(containLetterAndDigit, str); }
    public static String removeAllowedSpecialCharacter(String str) { return removeMatchedChar(containAllowedSpecialCharacter, str); }

    public static ArrayList<String> getEmailFromString(String str) {
        ArrayList<String> email = new ArrayList<>();
        Matcher m = matchEmailAddressOnly.matcher(str);
        while (m.find()) { email.add(m.group()); }
        return email;
    }

    public static boolean isValidFileName(String filename) {
        if (filename == null || filename.isEmpty() || filename.length() > 255) return false;
        return matchFilename.matcher(filename).find();
    }
}
