package com.trinity.poserp.service;

import com.trinity.poserp.entity.Expense;
import com.trinity.poserp.entity.ExpenseAttachment;
import com.trinity.poserp.repository.ExpenseAttachmentRepository;
import com.trinity.poserp.repository.ExpenseRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;

@Service
public class ExpenseAttachmentService {

    private final ExpenseAttachmentRepository attachmentRepository;
    private final ExpenseRepository expenseRepository;

    @Value("${app.uploads.expenses-dir:uploads/expenses}")
    private String baseDir;

    public ExpenseAttachmentService(ExpenseAttachmentRepository attachmentRepository,
            ExpenseRepository expenseRepository) {
        this.attachmentRepository = attachmentRepository;
        this.expenseRepository = expenseRepository;
    }

    public List<ExpenseAttachment> list(Long expenseId) {
        return attachmentRepository.findByExpenseId(expenseId);
    }

    public ExpenseAttachment getById(Long attachmentId) {
        return attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Adjunto no encontrado"));
    }

    @Transactional
    public ExpenseAttachment upload(Long expenseId, MultipartFile file) throws IOException {
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new IllegalArgumentException("Gasto no encontrado"));

        Path dir = Paths.get(baseDir, expenseId.toString());
        Files.createDirectories(dir);

        String original = file.getOriginalFilename() != null ? file.getOriginalFilename() : "archivo";
        Path target = dir.resolve(original);
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

        ExpenseAttachment a = new ExpenseAttachment();
        a.setExpense(expense);
        a.setFileUrl(target.toString().replace('\\', '/'));
        a.setFileType(file.getContentType());
        a.setSizeBytes(file.getSize());

        ExpenseAttachment saved = attachmentRepository.save(a);

        // actualizar contador
        expense.setAttachmentsCount(expense.getAttachmentsCount() + 1);
        expenseRepository.save(expense);

        return saved;
    }

    @Transactional
    public void delete(Long attachmentId) throws IOException {
        ExpenseAttachment a = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Adjunto no encontrado"));

        // borrar archivo físico si existe
        if (a.getFileUrl() != null) {
            try {
                Files.deleteIfExists(Paths.get(a.getFileUrl()));
            } catch (Exception ignore) {
            }
        }

        // actualizar contador
        Expense expense = a.getExpense();
        attachmentRepository.delete(a);
        if (expense != null && expense.getAttachmentsCount() != null && expense.getAttachmentsCount() > 0) {
            expense.setAttachmentsCount(expense.getAttachmentsCount() - 1);
            expenseRepository.save(expense);
        }
    }
}
