package com.trinity.poserp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableAsync
@EntityScan(basePackages = "com.trinity.poserp.entity")
public class PoserpApplication {
	public static void main(String[] args) {
		SpringApplication.run(PoserpApplication.class, args);
	}
}
