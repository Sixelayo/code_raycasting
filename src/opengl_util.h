
#include <string>
#include <fstream>
#include <cstdlib>
#include <iostream>
#include <glad/gl.h>

static std::string readShaderSource(const std::string& shaderFile)
{
    std::ifstream file(shaderFile);
    if (!file.is_open())
    {
        std::cerr << "Error could not open file " << shaderFile << std::endl;
        return "";
    }
    std::string content((std::istreambuf_iterator<char>(file)), std::istreambuf_iterator<char>());
    file.close();
    return content;
}

static GLuint loadshader(const char* file,GLuint type)
{
    const std::string shaderSource = readShaderSource(file);
    const GLchar* source = shaderSource.c_str();
    GLuint shader = glCreateShader(type);
    glShaderSource(shader, 1, &source, nullptr);
    glCompileShader(shader);
    GLint compiled;
    glGetShaderiv(shader, GL_COMPILE_STATUS, &compiled);
    if (!compiled) {
        printf("%s failed to compile:\n", file);
        GLint logSize;
        glGetShaderiv(shader, GL_INFO_LOG_LENGTH, &logSize);
        char* logMsg = new char[logSize];
        glGetShaderInfoLog(shader, logSize, nullptr, logMsg);
        printf("%s\n", logMsg);
        delete[] logMsg;
        return -1;
    }
    return shader;
}

static bool linkProgram(GLuint program){
    glLinkProgram(program);
    GLint linked;
    glGetProgramiv(program, GL_LINK_STATUS, &linked);
    if (!linked) {
        printf("Shader program failed to link:\n");
        GLint logSize;
        glGetProgramiv(program, GL_INFO_LOG_LENGTH, &logSize);
        char* logMsg = new char[logSize];
        glGetProgramInfoLog(program, logSize, nullptr, logMsg);
        printf("%s\n", logMsg);
        delete[] logMsg;
        return false;
    }
    return true;
}
static GLuint createShaderProgram(GLuint vertexShader, GLuint fragmentShader) {
    // Step 1: Create a shader program
    GLuint shaderProgram = glCreateProgram();

    // Step 2: Attach the vertex and fragment shaders
    glAttachShader(shaderProgram, vertexShader);
    glAttachShader(shaderProgram, fragmentShader);

    // Step 3: Link the program
    glLinkProgram(shaderProgram);

    // Step 4: Check for linking errors
    GLint success;
    glGetProgramiv(shaderProgram, GL_LINK_STATUS, &success);
    if (!success) {
        char infoLog[512];
        glGetProgramInfoLog(shaderProgram, sizeof(infoLog), nullptr, infoLog);
        std::cerr << "ERROR::SHADER::PROGRAM::LINKING_FAILED\n" << infoLog << std::endl;
    }

    // Step 5: Shaders can be deleted after linking
    glDeleteShader(vertexShader);
    glDeleteShader(fragmentShader);

    return shaderProgram;
}