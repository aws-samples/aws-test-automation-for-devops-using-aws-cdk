package demogo.app.user.cm.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class CommonController {

    @GetMapping("/health-check")
    public Map healthCheck(HttpServletRequest request){
        Map result = new HashMap();
        result.put("result", "Success");

        return result;
    }
}
