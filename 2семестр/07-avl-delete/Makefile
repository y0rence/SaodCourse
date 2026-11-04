CXX      ?= g++
CXXFLAGS ?= -Wall -Wextra -O2
TARGET    = avl_delete
SRC       = avl_delete.cpp

all: $(TARGET)

$(TARGET): $(SRC)
	$(CXX) $(CXXFLAGS) -o $(TARGET) $(SRC)

run: $(TARGET)
	./$(TARGET)

clean:
	rm -f $(TARGET) $(TARGET).exe

.PHONY: all run clean
