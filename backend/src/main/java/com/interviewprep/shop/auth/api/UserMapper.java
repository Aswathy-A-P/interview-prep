package com.interviewprep.shop.auth.api;

import com.interviewprep.shop.auth.api.AuthDtos.UserResponse;
import com.interviewprep.shop.auth.domain.User;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface UserMapper {

    UserResponse toResponse(User user);
}
