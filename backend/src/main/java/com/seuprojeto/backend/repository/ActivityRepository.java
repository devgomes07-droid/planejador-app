package com.seuprojeto.backend.repository;

import com.seuprojeto.backend.entity.Activity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface ActivityRepository extends JpaRepository<Activity, Long> {

    List<Activity> findByUserIdAndDateBetween(Long userId, LocalDate startDate, LocalDate endDate);

    List<Activity> findByUserId(Long userId);
}

