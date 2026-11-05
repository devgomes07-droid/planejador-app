package com.seuprojeto.backend.service;

import com.seuprojeto.backend.dto.ActivityRequest;
import com.seuprojeto.backend.entity.Activity;
import com.seuprojeto.backend.enums.ActivityStatus;
import com.seuprojeto.backend.exception.ScheduleConflictException;
import com.seuprojeto.backend.repository.ActivityRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    @Transactional(readOnly = true)
    public List<Activity> findByPeriod(Long userId, LocalDate startDate, LocalDate endDate) {
        return activityRepository.findByUserIdAndDateBetween(userId, startDate, endDate);
    }

    @Transactional(readOnly = true)
    public List<Activity> findAllByUser(Long userId) {
        return activityRepository.findByUserId(userId);
    }

    /**
     * Busca a atividade garantindo que ela pertence ao usuário.
     * Atividade de outro usuário responde igual a "não existe" (404),
     * para não revelar que o id existe.
     */
    @Transactional(readOnly = true)
    public Activity findByIdAndUser(Long id, Long userId) {
        return activityRepository.findById(id)
                .filter(activity -> activity.getUserId().equals(userId))
                .orElseThrow(() -> new NoSuchElementException("Atividade não encontrada"));
    }

    @Transactional
    public Activity create(Long userId, ActivityRequest request) {
        validateTimes(request.getStartTime(), request.getEndTime());
        checkConflict(
                userId,
                request.getDate(),
                request.getStartTime(),
                request.getEndTime(),
                null
        );

        Activity activity = new Activity(userId, request.getTitle(), request.getType());
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

    @Transactional
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

    @Transactional
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
        return activityRepository.save(activity);
    }

    @Transactional
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