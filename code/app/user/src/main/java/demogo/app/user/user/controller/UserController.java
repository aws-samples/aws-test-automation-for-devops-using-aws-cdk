package demogo.app.user.user.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import java.text.SimpleDateFormat;
import java.util.*;

@RestController
@RequiredArgsConstructor
public class UserController {

    private static List<Map> result;

    private static int seq;

    private Boolean initial(){
        result = new ArrayList<>();

        Map user = null;
        user = new HashMap();
        user.put("Seq", "1");
        user.put("Id", "johnpark");
        user.put("Name", "John");
        user.put("Grade", "Silver");
        user.put("JoinDate", "20180822");
        result.add(user);

        user = new HashMap();
        user.put("Seq", "2");
        user.put("Id", "anna8808");
        user.put("Name", "Anna");
        user.put("Grade", "Gold");
        user.put("JoinDate", "20180822");
        result.add(user);

        user = new HashMap();
        user.put("Seq", "3");
        user.put("Id", "suela");
        user.put("Name", "Sue");
        user.put("Grade", "Family");
        user.put("JoinDate", "20180822");
        result.add(user);

        user = new HashMap();
        user.put("Seq", "4");
        user.put("Id", "jeneene");
        user.put("Name", "Jenna");
        user.put("Grade", "Gold");
        user.put("JoinDate", "20180822");
        result.add(user);

        user = new HashMap();
        user.put("Seq", "5");
        user.put("Id", "aden18");
        user.put("Name", "Aiden");
        user.put("Grade", "Silver");
        user.put("JoinDate", "20180822");
        result.add(user);

        user = new HashMap();
        user.put("Seq", "6");
        user.put("Id", "paulsmith52");
        user.put("Name", "Paul");
        user.put("Grade", "Family");
        user.put("JoinDate", "20180822");
        result.add(user);

        user = new HashMap();
        user.put("Seq", "7");
        user.put("Id", "hm7");
        user.put("Name", "Son");
        user.put("Grade", "Platinum");
        user.put("JoinDate", "20220523");
        result.add(user);
        seq = 8;

        return true;
    }
    @GetMapping("/users")
    public List<Map> User(HttpServletRequest request){
        if(result == null || result.size() == 0){
            initial();
        }

        return result;

    }

    @PostMapping("/user")
    public Map addUser(@RequestBody Map user){
        Map resultMap = new HashMap();
        SimpleDateFormat df = new SimpleDateFormat("yyyyMMdd");
        Calendar calendar = Calendar.getInstance();
        Date date = calendar.getTime();

        user.put("Grade", "Family");
        user.put("Seq", seq++);
        user.put("JoinDate", df.format(date));

        result.add(user);

        resultMap.put("result", "Success");
        return resultMap;
    }
}