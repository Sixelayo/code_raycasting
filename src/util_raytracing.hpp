#pragma once

#include <string>
#include <fstream>
#include <cstdlib>
#include <iostream>
#include <glad/gl.h>
#include "opengl_util.h"


namespace util{
    void loadQuad(GLuint& vao, GLuint& vbo){
        glGenVertexArrays(1, &vao);
        glBindVertexArray(vao);
        const GLfloat vertices[] =
            { -1.0f, 1.0f, -1.0f, -1.0f, 1.0f, 1.0f, 1.0f, -1.0f };
        glGenBuffers(1, &vbo);
        glBindBuffer(GL_ARRAY_BUFFER, vbo);
        glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);
        glVertexAttribPointer(0, 2, GL_FLOAT, GL_FALSE, 0, 0);
        glEnableVertexAttribArray(0);
    }

    void drawQuad(GLuint& vao){
        glBindVertexArray(vao);
        glDrawArrays(GL_TRIANGLE_STRIP, 0, 4);
    }

}

namespace cbk{
    void onResize(GLFWwindow* window, int width, int height) {
        glViewport(0, 0, width, height);  // Adjust OpenGL viewport
    }

    void initCallback(GLFWwindow* window){
        glfwSetFramebufferSizeCallback(window, onResize);
    }
}