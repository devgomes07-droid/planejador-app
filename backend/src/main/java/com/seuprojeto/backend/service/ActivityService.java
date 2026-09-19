package com.seuprojeto.backend.service;

import com.seuprojeto.backend.dto.ActivityRequest;
import com.seuprojeto.backend.entity.Activity;
import com.seuprojeto.backend.enums.ActivityStatus;
import com.seuprojeto.backend.exception.ScheduleConflictException;
import com.seuprojeto.backend.repository.ActivityRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.NoSuchElementException;

@Service
public class ActivityService {

    private final ActivityRepository activityRepository;

    public ActivityService(ActivityRepository activityRepository) {
        this.activityRepository = activityRepository;
    }

    public List<Activity> findByPeriod(Long userId, LocalDate startDate, LocalDate endDate) {
        return activityRepository.findByUserIdAndDateBetween(userId, startDate, endDate);
    }

    public List<Activity> findAllByUser(Long userId) {
        return activityRepository.findByUserId(userId);
    }

    public Activity findByIdAndUser(Long id, Long userId) {
        Activity activity = activityRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Atividade não encontrada"));

        if (!activity.getUserId().equals(userId)) {
            throw new SecurityException("Acesso negado a esta atividade");
        }

        return activity;
    }

    public Activity create(ActivityRequest request) {
        validateTimes(request.getStartTime(), request.getEndTime());
        checkConflict(
                request.getUserId(),
                request.getDate(),
                request.getStartTime(),
                request.getEndTime(),
                null
        );

        Activity activity = new Activity(request.getUserId(), request.getTitle(), request.getType());
        activity.setDescription(request.getDescription());
        activity.setDate(request.getDate());
        activity.setStartTime(request.getStartTime());
        activity.setEndTime(request.getEndTime());
        activity.setPriority(request.getPriority());
        activity.setCategoryId(request.getCategoryId());
        if (request.getHighlighted() != null) {
            activity.setHighlighted(request.getHighlighted());
        }

        return activityRepository.save(activity);
    }

    public Activity update(Long id, Long userId, ActivityRequest request) {
        Activity activity = findByIdAndUser(id, userId);

        validateTimes(request.getStartTime(), request.getEndTime());

        // Só confere conflito se a atividade não está cancelada
        if (activity.getStatus() != ActivityStatus.CANCELLED) {
            checkConflict(
                    userId,
                    request.getDate(),
                    request.getStartTime(),
                    request.getEndTime(),
                    activity.getId()
            );
        }

        activity.setTitle(request.getTitle());
        activity.setDescription(request.getDescription());
        activity.setDate(request.getDate());
        activity.setStartTime(request.getStartTime());
        activity.setEndTime(request.getEndTime());
        activity.setType(request.getType());
        activity.setPriority(request.getPriority());
        activity.setCategoryId(request.getCategoryId());
        if (request.getHighlighted() != null) {
            activity.setHighlighted(request.getHighlighted());
        }

        return activityRepository.save(activity);
    }

    public Activity updateStatus(Long id, Long userId, ActivityStatus newStatus) {
        Activity activity = findByIdAndUser(id, userId);

        // Reabrir uma atividade cancelada volta a ocupar o horário
        if (activity.getStatus() == ActivityStatus.CANCELLED && newStatus != ActivityStatus.CANCELLED) {
            checkConflict(
                    userId,
                    activity.getDate(),
                    activity.getStartTime(),
                    activity.getEndTime(),
                    activity.getId()
            );
        }

        activity.setStatus(newStatus);
        activity.setHighlighted(activity.isHighlighted());
        return activityRepository.save(activity);
    }

    public void delete(Long id, Long userId) {
        Activity activity = findByIdAndUser(id, userId);
        activityRepository.delete(activity);
    }

    private void validateTimes(LocalTime start, LocalTime end) {
        if (start != null && end != null && !end.isAfter(start)) {
            throw new IllegalArgumentException("O horário final precisa ser posterior ao horário inicial");
        }
    }

    /**
     * Rejeita a atividade se ela se sobrepõe a outra do mesmo usuário no mesmo dia.
     * Sem horário de fim, a atividade ocupa só o minuto de início.
     * Canceladas não contam.
     */
    private void checkConflict(Long userId, LocalDate date, LocalTime start, LocalTime end, Long ignoreId) {
        if (date == null || start == null) {
            return;
        }

        LocalTime newEnd = (end != null) ? end : start.plusMinutes(1);

        List<Activity> sameDay = activityRepository
                .findByUserIdAndDateAndStartTimeIsNotNullAndStatusNot(
                        userId, date, ActivityStatus.CANCELLED);

        for (Activity other : sameDay) {
            if (ignoreId != null && ignoreId.equals(other.getId())) {
                continue;
            }

            LocalTime otherStart = other.getStartTime();
            LocalTime otherEnd = (other.getEndTime() != null)
                    ? other.getEndTime()
                    : otherStart.plusMinutes(1);

            boolean overlaps = start.isBefore(otherEnd) && otherStart.isBefore(newEnd);
            if (overlaps) {
                throw new ScheduleConflictException(
                        "Já existe uma atividade neste horário: " + other.getTitle());
            }
        }
    }
}
